#import <Cordova/CDVPlugin.h>
#import <Cordova/CDVInvokedUrlCommand.h>

@interface Pbkdf2 : CDVPlugin {
}

- (void) genKey:(CDVInvokedUrlCommand*)command;

@end
