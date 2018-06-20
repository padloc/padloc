#import "CDVWKWebViewEngine+InputFocusFix.h"
#import <objc/runtime.h>

@implementation CDVWKWebViewEngine (InputFocusFix)
+ (void) load {
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        CDVWKWebViewEngine *cdvWKWebViewEngine = [[CDVWKWebViewEngine alloc] init];
        [cdvWKWebViewEngine swizzleWKContentViewForInputFocus];
    });
}

- (void) swizzleWKContentViewForInputFocus {
    NSDictionary* settings = self.commandDelegate.settings;
    if (![settings cordovaBoolSettingForKey:@"KeyboardDisplayRequiresUserAction" defaultValue:YES]) {
        [self keyboardDisplayDoesNotRequireUserAction];
    }
}

// https://github.com/Telerik-Verified-Plugins/WKWebView/commit/04e8296adeb61f289f9c698045c19b62d080c7e3
// https://stackoverflow.com/a/48623286/3297914
- (void) keyboardDisplayDoesNotRequireUserAction {
    Class class = NSClassFromString(@"WKContentView");
    NSOperatingSystemVersion iOS_11_3_0 = (NSOperatingSystemVersion){11, 3, 0};

    if ([[NSProcessInfo processInfo] isOperatingSystemAtLeastVersion: iOS_11_3_0]) {
        SEL selector = sel_getUid("_startAssistingNode:userIsInteracting:blurPreviousNode:changingActivityState:userObject:");
        Method method = class_getInstanceMethod(class, selector);
        IMP original = method_getImplementation(method);
        IMP override = imp_implementationWithBlock(^void(id me, void* arg0, BOOL arg1, BOOL arg2, BOOL arg3, id arg4) {
            ((void (*)(id, SEL, void*, BOOL, BOOL, BOOL, id))original)(me, selector, arg0, TRUE, arg2, arg3, arg4);
        });
        method_setImplementation(method, override);
    } else {
        SEL selector = sel_getUid("_startAssistingNode:userIsInteracting:blurPreviousNode:userObject:");
        Method method = class_getInstanceMethod(class, selector);
        IMP original = method_getImplementation(method);
        IMP override = imp_implementationWithBlock(^void(id me, void* arg0, BOOL arg1, BOOL arg2, id arg3) {
            ((void (*)(id, SEL, void*, BOOL, BOOL, id))original)(me, selector, arg0, TRUE, arg2, arg3);
        });
        method_setImplementation(method, override);
    }
}
@end
