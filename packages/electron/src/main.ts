import { app, BrowserWindow, Menu, dialog, shell, powerMonitor } from "electron";
import { autoUpdater, UpdateInfo } from "electron-updater";
// import * as os from "os";
import ElectronStore from "electron-store";

const debug = process.argv.includes("--dbg");
const pwaUrl = process.env.PL_PWA_URL!.replace(/(\/*)$/, "");
const appName = process.env.PL_APP_NAME!;
const appScheme = process.env.PL_APP_SCHEME!;

const settings = new ElectronStore({
    name: "settings",
    defaults: {
        autoDownloadUpdates: false,
        allowPrerelease: autoUpdater.allowPrerelease,
        windowBounds: {
            width: 1100,
            height: 800,
        },
        fullscreen: false,
    },
});

let win: BrowserWindow;
let updateOnQuit = false;

async function updateReady(updateInfo: UpdateInfo) {
    const { response } = await dialog.showMessageBox(win, {
        message: "Install Update",
        detail:
            `${appName} version ${updateInfo.version} has been downloaded. The update will be installed ` +
            `the next time the app is launched.`,
        buttons: ["Install Later", "Install And Restart"],
        defaultId: 1,
    });

    if (response === 1) {
        autoUpdater.quitAndInstall();
    } else {
        updateOnQuit = true;
    }
}

autoUpdater.on("update-downloaded", updateReady);

// function htmlToText(html: string) {
//     return html
//         .replace(/<p>([\w\W]*?)<\/p>/g, "$1")
//         .replace(/<\/?ul>/g, "")
//         .replace(/<li>([\w\W]*?)<\/li>/g, "\u2022 $1");
// }

// async function updateAvailable(versionInfo: UpdateInfo) {
//     if (autoUpdater.autoDownload) {
//         return;
//     }

//     const { response, checkboxChecked } = await dialog.showMessageBox(win, {
//         type: "info",
//         message: `A new version of Padloc is available! (v${versionInfo.version})`,
//         detail: htmlToText(versionInfo.releaseNotes as string),
//         checkboxLabel: "Automatically download and install updates in the future (recommended)",
//         buttons: ["Remind Me Later", "Download And Install"],
//         defaultId: 1,
//     });

//     settings.set("autoDownloadUpdates", checkboxChecked);

//     if (response === 1) {
//         autoUpdater.downloadUpdate();

//         dialog.showMessageBox(win, {
//             message: "Downloading Update...",
//             detail: "The new version is being downloaded. You'll be notified when it is ready to be installed!",
//         });
//     }
// }

// async function checkForUpdates(manual = false) {
//     autoUpdater.autoDownload = settings.get("autoDownloadUpdates") as boolean;
//     autoUpdater.allowPrerelease = settings.get("allowPrerelease") as boolean;

//     const result = await autoUpdater.checkForUpdates();
//     const hasUpdate = typeof result.downloadPromise !== "undefined";

//     if (debug) {
//         console.log("update check result: ", result, hasUpdate);
//     }

//     if (hasUpdate) {
//         updateAvailable(result.versionInfo);
//     } else if (manual) {
//         const { checkboxChecked } = await dialog.showMessageBox(win, {
//             type: "info",
//             message: "No Updates Available",
//             detail: "Your version of Padloc is up to date.",
//             checkboxLabel: "Automatically download and install updates in the future (recommended)",
//             checkboxChecked: settings.get("autoDownloadUpdates") as boolean,
//         });

//         settings.set("autoDownloadUpdates", checkboxChecked);
//     }
// }

function createWindow(path: string = "") {
    // Create the browser window.
    console.log(`opening window at path: ${path || "/"})`);

    const minWidth = 360;
    const minHeight = 640;
    const { width, height, x, y } = settings.get("windowBounds") as any;
    win = new BrowserWindow({
        title: appName,
        width: Math.max(width, minWidth),
        height: Math.max(height, minHeight),
        x: Math.max(x, 0),
        y: Math.max(y, 0),
        fullscreen: settings.get("fullscreen") as boolean,
        fullscreenable: true,
        // backgroundColor: "#59c6ff",
        // frame: false,
        // transparent: false,
        hasShadow: true,
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            devTools: debug,
        },
        minWidth,
        minHeight,
    });

    if (debug) {
        win.webContents.openDevTools();
    }

    // win.loadFile("index.html");
    win.loadURL(`${pwaUrl}/${path}`);

    win.once("ready-to-show", () => {
        win.show();
    });

    win.on("close", () => {
        settings.set("windowBounds", win.getBounds());
        settings.set("fullscreen", win.isFullScreen());
    });

    // win.on("closed", () => {
    //     win = null;
    // });

    // Open links in browser
    win.webContents.on("new-window", function (e, url) {
        e.preventDefault();
        shell.openExternal(url);
    });

    return win;
}

function createApplicationMenu() {
    console.log("creating application menu...");
    // const checkForUpdatesItem = {
    //     label: "Check for Updates...",
    //     click() {
    //         checkForUpdates(true);
    //     },
    // };

    const appSubMenu: any[] = [];

    // appSubMenu.push(
    //     os.platform() === "darwin" ? { role: "about" } : { label: `Padloc v${app.getVersion()}`, enabled: false }
    // );

    // appSubMenu.push(checkForUpdatesItem);

    // if (os.platform() == "darwin") {
    //     appSubMenu.push({ type: "separator" }, { role: "hide" }, { role: "hideothers" }, { role: "unhide" });
    // }

    if (debug) {
        appSubMenu.push(
            { type: "separator" },
            {
                label: "Debug",
                submenu: [
                    {
                        label: "Open Dev Tools",
                        accelerator: "CmdOrCtrl+Shift+I",
                        click: () => win.webContents.toggleDevTools(),
                    },
                ],
            }
        );
    }

    appSubMenu.push({ type: "separator" }, { role: "quit" });

    // Set up menu
    const template = [
        {
            label: "Application",
            submenu: appSubMenu,
        },
        // {
        //     label: "Settings",
        //     submenu: [
        //         {
        //             label: "Updates",
        //             submenu: [
        //                 checkForUpdatesItem,
        //                 { type: "separator" },
        //                 {
        //                     type: "checkbox",
        //                     label: "Automatically Download and Install Updates",
        //                     checked: settings.get("autoDownloadUpdates"),
        //                     click(item: any) {
        //                         settings.set("autoDownloadUpdates", item.checked);
        //                     },
        //                 },
        //                 { type: "separator" },
        //                 {
        //                     type: "radio",
        //                     label: "Only Download Stable Releases (recommended)",
        //                     checked: !settings.get("allowPrerelease"),
        //                     click(item: any) {
        //                         settings.set("allowPrerelease", !item.checked);
        //                     },
        //                 },
        //                 {
        //                     type: "radio",
        //                     label: "Download Stable and Beta Releases",
        //                     checked: settings.get("allowPrerelease"),
        //                     click(item: any) {
        //                         settings.set("allowPrerelease", item.checked);
        //                     },
        //                 },
        //             ],
        //         },
        //         { type: "separator" },
        //     ],
        // },
        {
            label: "Edit",
            submenu: [
                { role: "undo" },
                { role: "redo" },
                { type: "separator" },
                { role: "cut" },
                { role: "copy" },
                { role: "paste" },
                { role: "selectall" },
            ],
        },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function goToUrl(url: string) {
    const path = url.replace(/\w+:(\/*)/, "");
    console.log("opening app at path:", path);
    if (win) {
        // win.loadURL(`${pwaUrl}/${path}`);
        win.webContents.executeJavaScript(`router.go("${path}")`);
    }
}

async function start() {
    console.log("starting app with arguments: ", process.argv.slice(1));

    if (!app.requestSingleInstanceLock()) {
        console.log("failed to obtain single instance lock. quitting...");
        app.quit();
        return;
    }

    app.on("second-instance", (_event, argv) => {
        console.log("second window instance requested.");
        // Someone tried to run a second instance, we should focus our window.
        if (win) {
            console.log("existing window found.");
            if (win.isMinimized()) {
                console.log("window is minimized. restoring...");
                win.restore();
            }
            win.focus();
        } else {
            console.log("no existing window found. creating...");
            createWindow();
        }
        const url = argv.find((arg) => arg.startsWith(`${appScheme}:`));
        if (url) {
            goToUrl(url);
        }
    });

    app.on("open-url", async (_event, url) => {
        console.log("opening via custom scheme. url: ", url);
        await app.whenReady();
        goToUrl(url);
    });

    await app.whenReady();

    // Quit app on suspend system event (can't lock it from here)
    powerMonitor.on("suspend", async () => {
        app.quit();
    });

    // Quit app on lock system event (can't lock it from here)
    powerMonitor.on("lock-screen", async () => {
        app.quit();
    });

    const startUrl = process.argv.find((arg) => arg.startsWith(`${appScheme}:`));
    const path = startUrl?.replace(/\w+:(\/*)/, "");

    createWindow(path);
    createApplicationMenu();

    app.setAsDefaultProtocolClient(appScheme);

    // Quit when all windows are closed.
    app.on("window-all-closed", () => {
        console.log("all windows closed. quitting app...");
        app.quit();
    });

    app.on("activate", () => {
        if (win === null) {
            createWindow();
        }
    });

    app.on("before-quit", (e) => {
        if (updateOnQuit) {
            updateOnQuit = false;
            e.preventDefault();
            autoUpdater.quitAndInstall();
        }
    });

    // ipcMain.on("check-updates", () => checkForUpdates(true));
}

start();
