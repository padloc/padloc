#import <Foundation/Foundation.h>
#import <WebKit/WebKit.h>

@interface PadlocMigrationReader : NSObject <WKURLSchemeHandler, WKScriptMessageHandler, WKNavigationDelegate>
@property(nonatomic,strong) WKWebView *webview;
@property(nonatomic,copy) void (^completion)(NSString *);
@end
@implementation PadlocMigrationReader
- (void)finish:(NSDictionary *)result {
    if (!self.completion) return;
    NSData *data = [NSJSONSerialization dataWithJSONObject:result options:0 error:nil];
    NSString *json = data.length <= 48 * 1024 * 1024 ? [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding] : nil;
    void (^complete)(NSString *) = self.completion;
    self.completion = nil;
    [self.webview stopLoading];
    [self.webview.configuration.userContentController removeScriptMessageHandlerForName:@"padlocMigration"];
    self.webview.navigationDelegate = nil;
    self.webview = nil;
    complete(json ?: @"{\"status\":\"error\"}");
}
- (void)webView:(WKWebView *)view startURLSchemeTask:(id<WKURLSchemeTask>)task {
    if (![task.request.URL.absoluteString isEqualToString:@"ionic://localhost/padloc-migration"]) {
        [task didFailWithError:[NSError errorWithDomain:@"PadlocMigration" code:1 userInfo:nil]];
        [self finish:@{@"status": @"error"}]; return;
    }
    NSData *data = [@"<!doctype html><meta http-equiv='Content-Security-Policy' content=\"default-src 'none'\"><title>Local migration</title>" dataUsingEncoding:NSUTF8StringEncoding];
    [task didReceiveResponse:[[NSURLResponse alloc] initWithURL:task.request.URL MIMEType:@"text/html" expectedContentLength:data.length textEncodingName:@"utf-8"]];
    [task didReceiveData:data]; [task didFinish];
}
- (void)webView:(WKWebView *)view stopURLSchemeTask:(id<WKURLSchemeTask>)task {}
- (void)webView:(WKWebView *)view decidePolicyForNavigationAction:(WKNavigationAction *)action decisionHandler:(void (^)(WKNavigationActionPolicy))decide {
    decide([action.request.URL.absoluteString isEqualToString:@"ionic://localhost/padloc-migration"] ? WKNavigationActionPolicyAllow : WKNavigationActionPolicyCancel);
}
- (void)webView:(WKWebView *)view didFailNavigation:(WKNavigation *)navigation withError:(NSError *)error { [self finish:@{@"status": @"error"}]; }
- (void)webView:(WKWebView *)view didFailProvisionalNavigation:(WKNavigation *)navigation withError:(NSError *)error { [self finish:@{@"status": @"error"}]; }
- (void)webViewWebContentProcessDidTerminate:(WKWebView *)view { [self finish:@{@"status": @"error"}]; }
- (void)userContentController:(WKUserContentController *)controller didReceiveScriptMessage:(WKScriptMessage *)message {
    if (!message.frameInfo.mainFrame || ![message.frameInfo.securityOrigin.protocol isEqualToString:@"ionic"] ||
        ![message.frameInfo.securityOrigin.host isEqualToString:@"localhost"] || ![message.body isKindOfClass:NSDictionary.class]) {
        [self finish:@{@"status": @"error"}]; return;
    }
    [self finish:message.body];
}
@end

// Called only on a Rust blocking worker; all WebKit work stays on main.
char *padloc_read_cordova_storage(const char *scriptBytes) {
    @autoreleasepool {
        NSString *script = [NSString stringWithUTF8String:scriptBytes];
        dispatch_semaphore_t done = dispatch_semaphore_create(0);
        __block NSString *result;
        dispatch_async(dispatch_get_main_queue(), ^{
            PadlocMigrationReader *reader = [PadlocMigrationReader new];
            reader.completion = ^(NSString *json) { result = json; dispatch_semaphore_signal(done); };
            WKWebViewConfiguration *config = [WKWebViewConfiguration new];
            config.websiteDataStore = WKWebsiteDataStore.defaultDataStore;
            [config setURLSchemeHandler:reader forURLScheme:@"ionic"];
            [config.userContentController addScriptMessageHandler:reader name:@"padlocMigration"];
            [config.userContentController addUserScript:[[WKUserScript alloc] initWithSource:script injectionTime:WKUserScriptInjectionTimeAtDocumentEnd forMainFrameOnly:YES]];
            reader.webview = [[WKWebView alloc] initWithFrame:CGRectZero configuration:config];
            reader.webview.navigationDelegate = reader;
            [reader.webview loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:@"ionic://localhost/padloc-migration"]]];
            dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 15 * NSEC_PER_SEC), dispatch_get_main_queue(), ^{ [reader finish:@{@"status": @"error"}]; });
        });
        dispatch_semaphore_wait(done, DISPATCH_TIME_FOREVER);
        return strdup((result ?: @"{\"status\":\"error\"}").UTF8String);
    }
}
void padloc_migration_free(char *value) { free(value); }
