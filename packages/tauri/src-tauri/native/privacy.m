#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>

// UIKit notifications and all window access stay on the main thread. The native
// cover is synchronous: it must not depend on the webview running JavaScript.
static __weak WKWebView *padlocWebView;
static UIView *privacyCover;
static uint64_t generation;
static double pausedAt;
static BOOL inactive;

static void onMain(dispatch_block_t block) {
    if ([NSThread isMainThread]) block();
    else dispatch_sync(dispatch_get_main_queue(), block);
}

static void conceal(void) {
    if (!inactive) {
        inactive = YES;
        generation++;
        pausedAt = NSDate.date.timeIntervalSince1970 * 1000;
    }
    UIWindow *window = padlocWebView.window;
    if (!window) return;
    if (!privacyCover) {
        privacyCover = [[UIView alloc] initWithFrame:window.bounds];
        privacyCover.backgroundColor = UIColor.systemBackgroundColor;
        privacyCover.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
        privacyCover.accessibilityIdentifier = @"padloc-privacy-cover";
        privacyCover.accessibilityLabel = @"Padloc privacy screen";
        privacyCover.isAccessibilityElement = YES;
        privacyCover.accessibilityViewIsModal = YES;
    }
    [window addSubview:privacyCover];
    [window bringSubviewToFront:privacyCover];
    [window layoutIfNeeded];
}

void padloc_install_privacy(void *webview) {
    onMain(^{
        padlocWebView = (__bridge WKWebView *)webview;
        static dispatch_once_t once;
        dispatch_once(&once, ^{
            NSNotificationCenter *center = NSNotificationCenter.defaultCenter;
            for (NSNotificationName name in @[UIApplicationWillResignActiveNotification,
                                               UIApplicationDidEnterBackgroundNotification]) {
                [center addObserverForName:name object:nil queue:nil usingBlock:^(NSNotification *note) {
                    conceal();
                }];
            }
            // Scene notifications also cover scene-based UIKit lifecycles.
            for (NSNotificationName name in @[UISceneWillDeactivateNotification,
                                               UISceneDidEnterBackgroundNotification]) {
                [center addObserverForName:name object:nil queue:nil usingBlock:^(NSNotification *note) {
                    if (note.object == padlocWebView.window.windowScene) conceal();
                }];
            }
            for (NSNotificationName name in @[UIApplicationDidBecomeActiveNotification,
                                               UISceneDidActivateNotification]) {
                [center addObserverForName:name object:nil queue:nil usingBlock:^(NSNotification *note) {
                    if ([note.object isKindOfClass:UIScene.class] &&
                        note.object != padlocWebView.window.windowScene) return;
                    inactive = NO;
                    // Keep the cover until JS has applied elapsed-time auto-lock.
                    [padlocWebView evaluateJavaScript:@"window.dispatchEvent(new Event('padloc-native-resume'))"
                                    completionHandler:nil];
                }];
            }
        });
    });
}

void padloc_background_state(uint64_t *currentGeneration, double *timestamp, bool *isInactive) {
    onMain(^{
        *currentGeneration = generation;
        *timestamp = pausedAt;
        *isInactive = inactive;
    });
}

void padloc_resume_complete(uint64_t expectedGeneration) {
    onMain(^{
        // An old asynchronous resume must never uncover a newer background visit.
        if (inactive || generation != expectedGeneration) return;
        [privacyCover removeFromSuperview];
        privacyCover = nil;
        pausedAt = 0;
    });
}
