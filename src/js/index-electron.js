
import {app, BrowserWindow} from "electron";

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow () {
    // This sets the initial window size.
    // If Sozi has been opened before, the size and location will be
    // loaded from local storage in backend/Electron.js.
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            spellcheck: false
        }
    });

    mainWindow.setMenuBarVisibility(false);

    if (process.env.SOZI_DEVTOOLS) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.loadURL(`file://${__dirname}/../index.html`);

    mainWindow.on("leave-html-full-screen", () => {
        mainWindow.setMenuBarVisibility(false);
    });

    // Emitted when the window is closed.
    mainWindow.on("closed", () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
}

// Workaround for launching error "GPU process isn't usable. Goodbye."
// See issue https://github.com/sozi-projects/Sozi/issues/603
app.commandLine.appendSwitch("disable-gpu-sandbox");

// Prevent Electron from altering colors in the SVG.
if (process.env.SOZI_DISABLE_COLOR_CORRECT_RENDERING) {
    app.commandLine.appendSwitch("disable-color-correct-rendering");
}

if (process.env.SOZI_DISABLE_HW_ACCELERATION) {
    app.disableHardwareAcceleration();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});
