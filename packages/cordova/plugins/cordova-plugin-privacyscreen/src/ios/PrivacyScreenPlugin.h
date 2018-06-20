/**
 * PrivacyScreenPlugin.h
 * Created by Tommy-Carlos Williams on 18/07/2014
 * Copyright (c) 2014 Tommy-Carlos Williams. All rights reserved.
 * MIT Licensed
 */
#import <Cordova/CDV.h>
#import <Cordova/CDVPlugin.h>

typedef struct {
  BOOL iPhone;
  BOOL iPad;
  BOOL iPhone4;
  BOOL iPhone5;
  BOOL iPhone6;
  BOOL iPhone6Plus;
  BOOL retina;
  
} CDV_iOSDevice;

@interface PrivacyScreenPlugin : CDVPlugin

@end