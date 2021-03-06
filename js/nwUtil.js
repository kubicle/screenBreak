'use strict';

var Arranger = require('./ui/Arranger');

var isNw = false;
var beforeunloadHandlers = [];

var arranger = null;
var screenWidth, screenHeight, screenX, screenY;
var mainWin, winX0, winY0, winWidth0, winHeight0;
var winX, winY, winWidth, winHeight;

var posChangeTime = 0;


function ViewportHandler() {
}

ViewportHandler.prototype.getWidth = function () { return winWidth; };
ViewportHandler.prototype.getHeight = function () { return winHeight; };

ViewportHandler.prototype.addElement = function (r) {
    if (isNw) {
        var margin = 2 * arranger.MARGIN;

        if (r.width + margin > winWidth || r.height + margin > winHeight) {
            var newWidth = Math.max(winWidth, r.width + margin);
            var newHeight = Math.max(winHeight, r.height + margin);

            setSize(newWidth, newHeight);

            var newX = Math.min(winX, screenX + screenWidth - newWidth);
            var newY = Math.min(winY, screenY + screenHeight - newHeight);
            if (newX !== winX || newY !== winY) setPos(newX, newY);
        }
    }
};

ViewportHandler.prototype.reduce = function (xLimit, yLimit) {
    if (isNw) {
        var limitMargin = arranger.MARGIN;
        xLimit += limitMargin; yLimit += limitMargin;

        var x = winX, y = winY;
        var w = winWidth, h = winHeight;
        if (xLimit < winWidth) {
            if (winX < winX0) x = Math.min(winX0, screenX + screenWidth - xLimit);
            w = Math.max(winWidth0, xLimit);
        }
        if (yLimit < winHeight) {
            if (winY < winY0) y = Math.min(winY0, screenY + screenHeight - yLimit);
            h = Math.max(winHeight0, yLimit);
        }
        if (x !== winX || y !== winY) setPos(x, y);
        if (w !== winWidth || h !== winHeight) setSize(w, h);
    }
};

function setPos(newX, newY) {
    posChangeTime = Date.now();
    mainWin.x = newX; // NB: if you re-read mainWin.x now it is *not yet* newX
    mainWin.y = newY;
    winX = newX;
    winY = newY;
}

function setSize(w, h) {
    mainWin.width = w;
    mainWin.height = h;
    winWidth = w;
    winHeight = h;
}


//---

exports.getArranger = function () {
    if (arranger) return arranger;

    arranger = new Arranger(new ViewportHandler());
    return arranger;
};

function nwUpdateScreenInfo() {
    // Find which screen mainWin is in
    var screens = nw.Screen.screens, screenRect;
    if (!screens) return console.warn('nw.Screen.screens is undefined');
    for (var i = 0; i < screens.length; i++) {
        screenRect = screens[i].work_area;
        if (winX >= screenRect.x && winX < screenRect.x + screenRect.width &&
            winY >= screenRect.y && winY < screenRect.y + screenRect.height) {
            break;
        }
    }
    // Keep this screen's dimensions
    screenX = screenRect.x; screenY = screenRect.y;
    screenWidth = screenRect.width; screenHeight = screenRect.height;
}

function nwUpdateWinInfo() {
    winX = winX0 = mainWin.x;
    winY = winY0 = mainWin.y;
    winWidth = winWidth0 = mainWin.width;
    winHeight = winHeight0 = mainWin.height;
}

function browserUpdateScreenInfo() {
    screenX = screenY = 0;
    screenWidth = winWidth = document.documentElement.clientWidth;
    screenHeight = winHeight = document.documentElement.clientHeight;
}

function resizeHandler() {
    screenWidth = winWidth = document.documentElement.clientWidth;
    screenHeight = winHeight = document.documentElement.clientHeight;
}

//---

exports.listenBeforeunload = function (handler) {
    beforeunloadHandlers.push(handler);
};

function triggerHandlers() {
    for (var i = 0; i < beforeunloadHandlers.length; i++) {
        beforeunloadHandlers[i]();
    }
    return true;
}

//---

function initializeForNw() {
    nw.Screen.Init();

    mainWin = nw.Window.get();
    nwUpdateWinInfo();

    mainWin.on('close', function () {
        triggerHandlers();
    });

    mainWin.on('move', function (x, y) {
        winX = x;
        winY = y;
        if (Date.now() - posChangeTime > 200) {
            winX0 = x;
            winY0 = y;
            nwUpdateScreenInfo(); // just in case mainWin was moved to other screen
        }
    });

    nwUpdateScreenInfo();
}

function terminateNw() {
    nw.Window.get().close(true);
}

function initializeForBrowser() {
    window.addEventListener('beforeunload', triggerHandlers);
    window.addEventListener('resize', resizeHandler);

    browserUpdateScreenInfo();
}

exports.initialize = function () {
    isNw = typeof process !== 'undefined' && !!process.versions['node-webkit'];

    if (isNw) {
        initializeForNw();
    } else {
        initializeForBrowser();
    }
};

exports.terminate = function () {
    if (isNw) {
        terminateNw();
    }
};

exports.isNw = function () { return isNw; };

exports.envInfo = function () {
    if (isNw) {
        return 'NW.js: ' + process.versions['node-webkit'];
    } else {
        return 'Browser: ' + navigator.userAgent;
    }
};
