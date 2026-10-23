#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

static NSURL *exportRoot(void) {
    return [[[NSFileManager defaultManager] URLsForDirectory:NSCachesDirectory inDomains:NSUserDomainMask].firstObject
        URLByAppendingPathComponent:@"PadlocShare" isDirectory:YES];
}

void padloc_share_cleanup(void) {
    [[NSFileManager defaultManager] removeItemAtURL:exportRoot() error:nil];
}

static char *response(NSDictionary *value) {
    NSData *json = [NSJSONSerialization dataWithJSONObject:value options:0 error:nil];
    return strdup([[NSString alloc] initWithData:json encoding:NSUTF8StringEncoding].UTF8String);
}

static NSDictionary *failed(void) {
    return @{@"error": @"Unable to share the file. Please try again."};
}

// Runs on a Rust blocking worker. Only presentation and completion use main.
char *padloc_share_file(const char *nameBytes, const char *base64Bytes) {
    @autoreleasepool {
        NSString *name = [NSString stringWithUTF8String:nameBytes];
        NSData *data = [[NSData alloc] initWithBase64EncodedString:[NSString stringWithUTF8String:base64Bytes] options:0];
        if (!name.length || ![name isEqualToString:name.lastPathComponent] ||
            [name isEqualToString:@"."] || [name isEqualToString:@".."] ||
            [name rangeOfString:@"\\"].location != NSNotFound || !data || data.length > 64 * 1024 * 1024) {
            return response(failed());
        }
        NSFileManager *manager = NSFileManager.defaultManager;
        NSURL *root = exportRoot();
        NSError *error = nil;
        if ([manager fileExistsAtPath:root.path] && ![manager removeItemAtURL:root error:&error]) return response(failed());
        if (![manager createDirectoryAtURL:root withIntermediateDirectories:YES
            attributes:@{NSFileProtectionKey: NSFileProtectionComplete} error:&error]) return response(failed());
        if (![root setResourceValue:@YES forKey:NSURLIsExcludedFromBackupKey error:&error]) {
            [manager removeItemAtURL:root error:nil];
            return response(failed());
        }
        NSURL *file = [root URLByAppendingPathComponent:name];
        if (![data writeToURL:file options:NSDataWritingAtomic | NSDataWritingFileProtectionComplete error:&error]) {
            [manager removeItemAtURL:root error:nil];
            return response(failed());
        }
        dispatch_semaphore_t finished = dispatch_semaphore_create(0);
        __block NSDictionary *result = nil;
        dispatch_async(dispatch_get_main_queue(), ^{
            UIWindow *window = nil;
            for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
                if (scene.activationState != UISceneActivationStateForegroundActive || ![scene isKindOfClass:UIWindowScene.class]) continue;
                for (UIWindow *candidate in ((UIWindowScene *)scene).windows) {
                    if (candidate.isKeyWindow) { window = candidate; break; }
                }
                if (window) break;
            }
            if (!window.windowScene) {
                result = failed();
                dispatch_semaphore_signal(finished);
                return;
            }
            // Tao creates its window with initWithFrame: before attaching its
            // scene. Present remote UIKit sharing UI from a scene-initialized
            // window so it receives the scene's complete presentation context.
            UIWindow *shareWindow = [[UIWindow alloc] initWithWindowScene:window.windowScene];
            shareWindow.windowLevel = window.windowLevel + 1;
            shareWindow.backgroundColor = UIColor.clearColor;
            UIViewController *presenter = [UIViewController new];
            presenter.view.backgroundColor = UIColor.clearColor;
            shareWindow.rootViewController = presenter;
            [shareWindow makeKeyAndVisible];
            [shareWindow layoutIfNeeded];
            UIActivityViewController *sheet = [[UIActivityViewController alloc] initWithActivityItems:@[file] applicationActivities:nil];
            UIPopoverPresentationController *popover = sheet.popoverPresentationController;
            popover.sourceView = presenter.view;
            popover.sourceRect = CGRectMake(CGRectGetMidX(presenter.view.bounds), CGRectGetMidY(presenter.view.bounds), 1, 1);
            popover.permittedArrowDirections = 0;
            sheet.completionWithItemsHandler = ^(UIActivityType type, BOOL completed, NSArray *items, NSError *shareError) {
                result = shareError ? failed() : @{@"completed": @(completed)};
                shareWindow.hidden = YES;
                shareWindow.rootViewController = nil;
                if (window.windowScene.activationState == UISceneActivationStateForegroundActive) [window makeKeyWindow];
                dispatch_semaphore_signal(finished);
            };
            [presenter presentViewController:sheet animated:YES completion:nil];
        });
        dispatch_semaphore_wait(finished, DISPATCH_TIME_FOREVER);
        if (![manager removeItemAtURL:root error:&error]) result = failed();
        return response(result ?: failed());
    }
}

void padloc_share_free(char *value) { free(value); }
