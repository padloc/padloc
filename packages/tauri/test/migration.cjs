const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),crypto=require('node:crypto'),vm=require('node:vm');
function load(name,deps={}){const file=path.join(__dirname,'../src',name+'.ts');const m=new Module(file,module);m.filename=file;m.paths=module.paths;const req=m.require.bind(m);m.require=n=>n in deps?deps[n]:req(n);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);return m.exports;}
const state=load('migration-state');
const {commitMigration}=load('migration',{'@tauri-apps/api/core':{},'@padloc/core/src/app':{AppState:class{}},'localforage/src/localforage':{},'./migration-state':state});
class DB {
 constructor(entries=[]){this.data=new Map(entries);this.failPut=0;this.corrupt=false;}
 transaction(){
  const owner=this, staged=new Map([...this.data].map(([k,v])=>[k,structuredClone(v)])),queue=[];
  let ended=false,pumping=false,puts=0;
  const tx={objectStore:()=>store,abort(){if(ended)return;ended=true;queueMicrotask(()=>tx.onabort?.());}};
  function request(fn){const req={};queue.push(()=>{try{req.result=fn();req.onsuccess?.();}catch{tx.abort();}});if(!pumping){pumping=true;queueMicrotask(pump);}return req;}
  function pump(){if(ended)return;if(queue.length){queue.shift()();queueMicrotask(pump);}else{ended=true;owner.data=staged;tx.oncomplete?.();}}
  const store={getAllKeys:()=>request(()=>[...staged.keys()]),getAll:()=>request(()=>[...staged.values()]),put:(v,k)=>request(()=>{if(++puts===owner.failPut)throw Error();staged.set(k,structuredClone(v));}),get:k=>request(()=>owner.corrupt?{corrupt:true}:staged.get(k))};
  return tx;
 }
}
const digest=async text=>crypto.createHash('sha256').update(text).digest('hex');
const raw={id:'app-state',kind:'appstate',settings:{theme:'dark'},vaults:[]};
const source={status:'found',entries:[[state.STATE_KEY,{type:'json',value:raw}],['publickeyauthclientdata_',{type:'json',value:{kind:'publickeyauthclientdata',id:'',key:'synthetic'}}],['binary',{type:'u8',value:[0,255,128,42]}]]};
function deps(db,input=source){return {marker:async()=>db.data.get(state.MIGRATION_KEY),readLegacy:async()=>structuredClone(input),validateState:s=>assert.equal(s.id,'app-state'),digest,commit:(e,m)=>commitMigration(db,e,m)};}
(async()=>{
 const untouched=JSON.stringify(source),db=new DB();
 assert.equal(await state.migrateStorage(deps(db)),'migrated');
 assert.deepEqual(db.data.get(state.STATE_KEY),raw);assert.deepEqual([...db.data.get('binary')],[0,255,128,42]);
 assert.ok(state.validMarker(db.data.get(state.MIGRATION_KEY)));assert.equal(JSON.stringify(source),untouched);
 const again=deps(db);again.readLegacy=async()=>{throw Error('must not reread after completed migration')};assert.equal(await state.migrateStorage(again),'already-complete');
 for(const failPut of [1,2,4]){const interrupted=new DB();interrupted.failPut=failPut;await assert.rejects(state.migrateStorage(deps(interrupted)));assert.equal(interrupted.data.size,0,'transaction must roll back data and checkpoint');interrupted.failPut=0;await state.migrateStorage(deps(interrupted));assert.ok(interrupted.data.has(state.MIGRATION_KEY));}
 const corrupt=new DB();corrupt.corrupt=true;await assert.rejects(state.migrateStorage(deps(corrupt)),/verification/);assert.equal(corrupt.data.size,0);
 const conflict=new DB([[state.STATE_KEY,{...raw,settings:{theme:'light'}}]]);await assert.rejects(state.migrateStorage(deps(conflict)),/conflicts/);assert.equal(conflict.data.get(state.STATE_KEY).settings.theme,'light');assert.ok(!conflict.data.has(state.MIGRATION_KEY));
 const identical=new DB([...db.data].filter(([k])=>k!==state.MIGRATION_KEY));await state.migrateStorage(deps(identical));assert.ok(identical.data.has(state.MIGRATION_KEY));
 for(const input of [{status:'error'},{status:'unsupported'},{status:'found',entries:[[state.STATE_KEY,{type:'json',value:raw}],[state.STATE_KEY,{type:'json',value:raw}]]},{status:'found',entries:[['x',{type:'u8',value:[256]}]]}]){const bad=new DB();await assert.rejects(state.migrateStorage(deps(bad,input)));assert.equal(bad.data.size,0);}
 const absent=new DB();assert.equal(await state.migrateStorage(deps(absent,{status:'absent'})),'absent');assert.equal(absent.data.size,1);
 const malformed=new DB([[state.MIGRATION_KEY,{version:999}]]);await assert.rejects(state.migrateStorage(deps(malformed)),/checkpoint/);
 // Exercise the actual bundled reader script through the WebKit message boundary.
 let delivered,request={},cursor={},transaction;
 const complex={id:'app-state',kind:'appstate',optional:undefined,nested:[undefined,new Uint8Array([0,255])]};
 const sourceDB={objectStoreNames:{contains:()=>true},close(){},transaction(){transaction={objectStore:()=>({openCursor:()=>cursor}),abort(){this.onabort?.();}};return transaction;}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src-tauri/native/migration-reader.js'),'utf8'),{
  Object,Array,Uint8Array,ArrayBuffer,JSON,Number,Error,indexedDB:{open:()=>request},localStorage:{},
  window:{webkit:{messageHandlers:{padlocMigration:{postMessage:x=>{delivered=JSON.parse(JSON.stringify(x));}}}}}});
 request.result=sourceDB;request.onsuccess();cursor.result={key:state.STATE_KEY,value:complex,continue(){}};cursor.onsuccess();cursor.result=null;cursor.onsuccess();transaction.oncomplete();
 assert.equal(delivered.status,'found');const typed=new DB();await state.migrateStorage(deps(typed,delivered));
 assert.ok(Object.hasOwn(typed.data.get(state.STATE_KEY),'optional'));assert.equal(typed.data.get(state.STATE_KEY).optional,undefined);
 assert.deepEqual([...typed.data.get(state.STATE_KEY).nested[1]],[0,255]);
 console.log('Migration: atomic rollback/retry, conflicts, read-back verification, binary data, auxiliary auth records, malformed sources and idempotence passed');
})().catch(e=>{console.error(e);process.exitCode=1});
