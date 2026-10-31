// Test-fixture-only scene bootstrap for the installed iOS 27 SDK.
const fs = require("node:fs"),
    path = require("node:path"),
    cp = require("node:child_process");
const target = process.argv[2];
if (!target || !path.isAbsolute(target)) throw new Error("Pass the absolute fixture directory");
const config = fs.readFileSync(path.join(target, "config.xml"), "utf8");
if (!["app.padloc.tauri.migration-test", "app.padloc.tauri.ios-test"].some((id) => config.includes('id="' + id + '"')))
    throw new Error("Not the migration fixture");
const base = path.join(target, "platforms/ios/Padloc Migration Test");
const source = path.join(base, "Classes/AppDelegate.m");
const marker = "@interface PadlocMigrationScene";
if (!fs.readFileSync(source, "utf8").includes(marker))
    fs.appendFileSync(
        source,
        `
// Test harness only: retain the Cordova engine and its persistent data store.
@interface PadlocMigrationScene : UIResponder <UIWindowSceneDelegate>
@property(nonatomic,strong) UIWindow *window;
@end
@implementation PadlocMigrationScene
- (void)scene:(UIScene *)scene willConnectToSession:(UISceneSession *)session options:(UISceneConnectionOptions *)options {
    AppDelegate *app = (AppDelegate *)UIApplication.sharedApplication.delegate;
    self.window = app.window;
    self.window.windowScene = (UIWindowScene *)scene;
    [self.window makeKeyAndVisible];
}
@end
`
    );
const plist = path.join(base, "Padloc Migration Test-Info.plist");
const patch = {
    UIApplicationSceneManifest: {
        UIApplicationSupportsMultipleScenes: false,
        UISceneConfigurations: {
            UIWindowSceneSessionRoleApplication: [
                { UISceneConfigurationName: "Default", UISceneDelegateClassName: "PadlocMigrationScene" },
            ],
        },
    },
};
// Merge using Python's standard plist parser, preserving all other generated keys.
cp.execFileSync("/usr/bin/python3", [
    "-c",
    `import plistlib,json,sys\np=sys.argv[1]\nwith open(p,'rb') as f: d=plistlib.load(f)\nd.update(json.loads(sys.argv[2]))\nwith open(p,'wb') as f: plistlib.dump(d,f)`,
    plist,
    JSON.stringify(patch),
]);
console.log("Applied fixture-only scene bootstrap");
