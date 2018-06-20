#import <objc/runtime.h>
#import <Cordova/NSDictionary+CordovaPreferences.h>
#import "CDVWKWebViewEngine.h"

@interface CDVWKWebViewEngine (InputFocusFix)
+ (void) load;
- (void) swizzleWKContentViewForInputFocus;
- (void) keyboardDisplayDoesNotRequireUserAction;
@end