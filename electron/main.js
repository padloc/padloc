"use strict";

const { app, shell, BrowserWindow, Menu, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const url = require("url");
const os = require("os");

let win;

autoUpdater.autoDownload = false;

autoUpdater.on("update-available", (updateInfo) => {
    dialog.showMessageBox({
        type: "info",
        title: `Update Available (Version ${updateInfo.version})`,
        message: "A new version of Padlock is available! Do you want to install it now?",
        buttons: ["Download & Install", "Later"]
    }, (buttonIndex) => {
        if (buttonIndex === 0) {
            autoUpdater.downloadUpdate();
            dialog.showMessageBox({
                title: "Downloading Update...",
                type: "info",
                message: "The new version is being downloaded. You'll be notified when it is ready to be installed!"
            });
        }
    });
});

autoUpdater.on("update-downloaded", (updateInfo) => {
    dialog.showMessageBox({
        title: "Install Update",
        message: `Padlock version ${updateInfo.version} has been downloaded and is ready to be installed!`,
        buttons: ["Quit & Install", "Cancel"]
    }, (buttonIndex) => {
        if (buttonIndex === 0) {
            autoUpdater.quitAndInstall();
        }
    });
});

function createWindow() {
    // Create the browser window.
    win = new BrowserWindow({
        width: 800,
        height: 600
    });

    // and load the index.html of the app.
    win.loadURL(url.format({
        pathname: path.join(__dirname, "index.html"),
        protocol: "file:",
        slashes: true
    }));

    // Open the DevTools.
    // win.webContents.openDevTools();

    win.on("closed", () => {
        win = null;
    });

    // Open links in browser
    win.webContents.on("new-window", function(e, url) {
        e.preventDefault();
        shell.openExternal(url);
    });

    win.webContents.on("did-frame-finish-load", function() {
        autoUpdater.checkForUpdates();
    });
}

function createApplicationMenu() {
    // Set up menu
    const template = [
        {
            label: "Application",
            submenu: [
                { role: "about" },
                { type: "separator" },
                { role: "quit" }
            ]
        },
        {
            label: "Edit",
            submenu: [
                { role: "undo" },
                { role: "redo" },
                { type: "separator" },
                { role: "cut" },
                { role: "copy" },
                { role: "paste" },
                { role: "selectall" }
            ]
        }
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
    createWindow();
    // Create application on macOS
    if (os.platform() === "darwin") {
        createApplicationMenu();
    }
});

// Quit when all windows are closed.
app.on("window-all-closed", () => {
    app.quit();
});

app.on("activate", () => {
    if (win === null) {
        createWindow();
    }
});
