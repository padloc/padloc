#import "Pbkdf2.h"
#import <CommonCrypto/CommonKeyDerivation.h>

@implementation Pbkdf2

- (void) genKey:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{
        CDVPluginResult* pluginResult;
        @try {
            NSString* password = [command.arguments objectAtIndex:0];
            NSString* salt = [command.arguments objectAtIndex:1];
            int iter = [[command.arguments objectAtIndex:2] intValue];
            int keySize = [[command.arguments objectAtIndex:3] intValue];

            if (iter < 0) {
                @throw @"Iteration count needs to be a positive number";
            }

            if (keySize != 256 && keySize != 512) {
                @throw @"Unsupported key size";
            }

            NSData* passData = [password dataUsingEncoding:NSUTF8StringEncoding];
            NSData* saltData = [[NSData alloc] initWithBase64EncodedString:salt options:0];

            unsigned char key[keySize/8];
            CCKeyDerivationPBKDF(
                kCCPBKDF2,
                passData.bytes,
                passData.length,
                saltData.bytes,
                saltData.length,
                kCCPRFHmacAlgSHA256,
                iter,
                key,
                keySize/8
            );

            NSData* keyData = [[NSData alloc] initWithBytes: key length: keySize/8];

            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:[keyData base64EncodedStringWithOptions:0]];
        }
        @catch(NSException *exception) {
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:[exception reason]];
        }
        @catch(NSString *exception) {
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:exception];
        }

        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }];
}

@end
