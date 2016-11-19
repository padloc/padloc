"use strict";

const {app, shell, BrowserWindow, Menu} = require("electron");
const {autoUpdater} = require("electron-auto-updater");
const path = require("path");
const url = require("url");
const os = require("os");

let win;

if (os.platform() == "darwin") {
    const updateUrl = `https://download.padlock.io/update/${os.platform()}_${os.arch()}/${app.getVersion()}`;
    autoUpdater.setFeedURL(updateUrl);
}

function handleAutoUpdateEvent() {
    if (win) {
        win.webContents.send("auto-update", ...arguments);
    }
}

for (let evt of ["update-available", "update-downloaded", "error",
        "checking-for-update", "update-not-available"]) {
    autoUpdater.addListener(evt, handleAutoUpdateEvent.bind(null, evt));
}

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
