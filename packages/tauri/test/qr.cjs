const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const flush = async () => { for(let i=0;i<30;i++) await Promise.resolve(); };
const deferred = () => { let resolve,reject; const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}; };
function fixture() {
 let permission='granted', request=deferred(), native, calls=[], cancels=0;
 const document={body:{style:{background:'body-color'}},documentElement:{style:{background:'root-color'}}};
 const plugin={Format:{QRCode:'QR_CODE'},checkPermissions:async()=>permission,
 requestPermissions:()=>request.promise,
 scan:async(options)=>{calls.push(options); native=deferred();return native.promise;},
 cancel:async()=>{cancels++;native.reject('cancelled');}};
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/qr.ts'),'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,
 {module,exports:module.exports,document,require:()=>plugin});
 return {scanner:new module.exports.NativeQRScanner(),document,calls,get cancels(){return cancels;},
 setPermission:p=>permission=p,grant:()=>request.resolve('granted'),result:r=>native.resolve(r),fail:e=>native.reject(e)};
}
(async()=>{
 {
 const f=fixture();const result=f.scanner.scan();await flush();
 assert.equal(f.calls[0].formats.join(','),'QR_CODE');assert.equal(f.calls[0].windowed,true);
 assert.equal(f.document.body.style.background,'transparent');
 await assert.rejects(f.scanner.scan(),/already running/);
 f.result({content:'otpauth://totp/test?secret=SYNTHETIC'});
 assert.equal(await result,'otpauth://totp/test?secret=SYNTHETIC');
 assert.equal(f.document.body.style.background,'body-color');assert.equal(f.document.documentElement.style.background,'root-color');
 await f.scanner.stop();assert.equal(f.cancels,0,'success must not issue a second native cancel');
 }
 {
 const f=fixture();f.setPermission('denied');await assert.rejects(f.scanner.scan(),/Settings/);assert.equal(f.calls.length,0);
 f.setPermission('granted');const p=f.scanner.scan();await flush();f.fail({message:'No camera available on this device'});
 await assert.rejects(p,/No camera available/);assert.equal(f.document.body.style.background,'body-color');
 }
 {
 const f=fixture();f.setPermission('prompt');const p=f.scanner.scan();const rejected=assert.rejects(p,/cancelled/);await flush();
 const stopped=f.scanner.stop();f.grant();await stopped;await rejected;assert.equal(f.calls.length,0);
 }
 {
 const f=fixture();const p=f.scanner.scan();const rejected=assert.rejects(p,/cancelled/);await flush();
 const stopped=f.scanner.stop();const next=f.scanner.scan();await stopped;await rejected;await flush();
 assert.equal(f.cancels,1);assert.equal(f.calls.length,2);
 assert.equal(f.document.body.style.background,'transparent','old cleanup must not hide new camera');
 f.result({content:'next'});assert.equal(await next,'next');assert.equal(f.document.body.style.background,'body-color');
 }
 {
 const f=fixture();f.setPermission('prompt');const p=f.scanner.scan();await flush();f.grant();await flush();
 assert.equal(f.calls.length,1);f.result({content:'granted'});assert.equal(await p,'granted');
 }
 {
 const f=fixture();const p=f.scanner.scan();await flush();f.result({});await assert.rejects(p,/invalid QR/);
 assert.equal(f.document.body.style.background,'body-color');
 }
 const capability=JSON.parse(fs.readFileSync(path.join(__dirname,'../src-tauri/capabilities/qr.json')));
 assert.deepEqual(capability.platforms,['iOS']);assert.deepEqual(capability.windows,['main']);
 assert.deepEqual(capability.permissions,['barcode-scanner:allow-scan','barcode-scanner:allow-cancel','barcode-scanner:allow-check-permissions','barcode-scanner:allow-request-permissions']);
 console.log('QR adapter: QR-only results, permissions, cancellation, reopen ordering and appearance cleanup passed');
})().catch(e=>{console.error(e);process.exitCode=1});
