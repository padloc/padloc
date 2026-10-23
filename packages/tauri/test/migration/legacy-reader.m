#import <Foundation/Foundation.h>
#import <WebKit/WebKit.h>

// Experimental read-only feasibility probe. No production accounts or IPC API.
@interface PadlocLegacyProbe : NSObject <WKURLSchemeHandler, WKScriptMessageHandler, WKNavigationDelegate>
@property(nonatomic,strong) WKWebView *reader;
@property(nonatomic,weak) WKWebView *destination;
@end
@implementation PadlocLegacyProbe
- (void)webView:(WKWebView *)webView startURLSchemeTask:(id<WKURLSchemeTask>)task {
    if (![task.request.URL.absoluteString isEqualToString:@"ionic://localhost/migration-probe"]) {
        [task didFailWithError:[NSError errorWithDomain:@"PadlocMigrationProbe" code:1 userInfo:nil]];
        return;
    }
    NSString *html = @"<!doctype html><meta charset='utf-8'><script>"
      "const report=x=>window.webkit.messageHandlers.migrationProbe.postMessage(x);"
      "const req=indexedDB.open('localforage');"
      "req.onupgradeneeded=()=>{req.transaction.abort();report({error:'Legacy database absent; creation aborted'});};"
      "req.onerror=()=>report({error:'Legacy database unavailable'});"
      "req.onsuccess=()=>{const db=req.result;"
      "if(!db.objectStoreNames.contains('keyvaluepairs')){db.close();report({error:'Legacy store absent'});return;}"
      "const tx=db.transaction('keyvaluepairs','readonly'),store=tx.objectStore('keyvaluepairs');"
      "const a=store.get('padloc_migration_probe'),b=store.get('padloc_migration_binary');"
      "tx.oncomplete=()=>{db.close();report({origin:location.origin,found:!!a.result,"
      "marker:a.result&&a.result.marker,binary:Array.from(b.result||[])});};"
      "tx.onerror=()=>{db.close();report({error:'Legacy read failed'});};};"
      "</script>";
    NSData *data=[html dataUsingEncoding:NSUTF8StringEncoding];
    [task didReceiveResponse:[[NSURLResponse alloc] initWithURL:task.request.URL MIMEType:@"text/html" expectedContentLength:data.length textEncodingName:@"utf-8"]];
    [task didReceiveData:data]; [task didFinish];
}
- (void)webView:(WKWebView *)webView stopURLSchemeTask:(id<WKURLSchemeTask>)task {}
- (void)webView:(WKWebView *)webView decidePolicyForNavigationAction:(WKNavigationAction *)action decisionHandler:(void (^)(WKNavigationActionPolicy))decision {
    decision([action.request.URL.absoluteString isEqualToString:@"ionic://localhost/migration-probe"] ? WKNavigationActionPolicyAllow : WKNavigationActionPolicyCancel);
}
- (void)userContentController:(WKUserContentController *)controller didReceiveScriptMessage:(WKScriptMessage *)message {
    if (![message.frameInfo.securityOrigin.protocol isEqualToString:@"ionic"] ||
        ![message.frameInfo.securityOrigin.host isEqualToString:@"localhost"]) return;
    NSData *data=[NSJSONSerialization dataWithJSONObject:message.body options:0 error:nil];
    if (!data) return;
    NSString *json=[[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    NSString *script=[NSString stringWithFormat:@"window.__padlocLegacyProbe=%@;window.dispatchEvent(new Event('padloc-legacy-probe'));",json];
    [self.destination evaluateJavaScript:script completionHandler:nil];
    [self.reader.configuration.userContentController removeScriptMessageHandlerForName:@"migrationProbe"];
    [self.reader stopLoading]; self.reader=nil;
}
@end

void padloc_legacy_probe(void *view) {
    // Guard both the experimental feature and the disposable fixture identity.
    if (![@[@"app.padloc.tauri.migration-test", @"app.padloc.tauri.ios-test"] containsObject:NSBundle.mainBundle.bundleIdentifier]) return;
    dispatch_async(dispatch_get_main_queue(), ^{
        static PadlocLegacyProbe *probe;
        probe=[PadlocLegacyProbe new];
        probe.destination=(__bridge WKWebView *)view;
        WKWebViewConfiguration *config=[WKWebViewConfiguration new];
        config.websiteDataStore=WKWebsiteDataStore.defaultDataStore;
        [config setURLSchemeHandler:probe forURLScheme:@"ionic"];
        [config.userContentController addScriptMessageHandler:probe name:@"migrationProbe"];
        probe.reader=[[WKWebView alloc] initWithFrame:CGRectZero configuration:config];
        probe.reader.navigationDelegate=probe;
        [probe.reader loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:@"ionic://localhost/migration-probe"]]];
    });
}
