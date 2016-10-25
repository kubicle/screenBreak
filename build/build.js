(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function (css, customDocument) {
  var doc = customDocument || document;
  if (doc.createStyleSheet) {
    var sheet = doc.createStyleSheet()
    sheet.cssText = css;
    return sheet.ownerNode;
  } else {
    var head = doc.getElementsByTagName('head')[0],
        style = doc.createElement('style');

    style.type = 'text/css';

    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(doc.createTextNode(css));
    }

    head.appendChild(style);
    return style;
  }
};

module.exports.byUrl = function(url) {
  if (document.createStyleSheet) {
    return document.createStyleSheet(url).ownerNode;
  } else {
    var head = document.getElementsByTagName('head')[0],
        link = document.createElement('link');

    link.rel = 'stylesheet';
    link.href = url;

    head.appendChild(link);
    return link;
  }
};

},{}],2:[function(require,module,exports){
module.exports = require('cssify');

},{"cssify":1}],3:[function(require,module,exports){
'use strict';


function Task(state) {
    state = state || {};
    this.name = state.name || '';
    this.timeWorked = state.timeWorked || 0;
}
module.exports = Task;


Task.prototype.serialize = function () {
    return {
        name: this.name,
        timeWorked: this.timeWorked
    };
};

Task.prototype.getName = function () {
    return this.name;
};

Task.prototype.getTimeWorked = function () {
    return this.timeWorked;
};

Task.prototype.updateTime = function (time) {
    this.timeWorked = time;
};

Task.prototype.rename = function (name) {
    this.name = name;
};

},{}],4:[function(require,module,exports){
'use strict';

var Task = require('./Task');

var MINUTE = 60000, HOUR = 3600000;
var NONSTOP_PERIOD = 60 * MINUTE;
var REST_FOR_NONSTOP_PERIOD = 5 * MINUTE;
var NEW_DAY_BREAK = 6 * HOUR;


function Workometer(state) {
	this.level = 0;
	this.isResting = true; // created in "resting" state; we will be starting work right away

	state = state || {};
	this.time0 = this.lastWorkTime = state.lastWorkTime || Date.now();
	this.taskWork = state.taskWork || 0;
	this.todaysWork = state.todaysWork || 0;
	this.fatigue = state.fatigue || 0;
	this.tasks = state.tasks || {};

	if (state.curTaskName !== undefined) {
		this._loadCurTask(state.curTaskName);
	} else {
		this._createTask();
	}
}
module.exports = Workometer;


Workometer.prototype.gotBreak = function (minPause) {
	var correction = minPause * MINUTE;
	this._updateFatigue(correction);
	this.taskWork = Math.max(this.taskWork - correction, 0);
	this.todaysWork = Math.max(this.todaysWork - correction, 0);
};

Workometer.prototype.serialize = function () {
	this._saveCurTask();

	return {
		lastWorkTime: this.time0,
		taskWork: this.taskWork,
		todaysWork: this.todaysWork,
		fatigue: this.fatigue,
		tasks: this.tasks,
		curTaskName: this.curTask.name
	};
};

Workometer.prototype._checkNewDay = function () {
	if (Date.now() - this.lastWorkTime > NEW_DAY_BREAK) {
		this.todaysWork = 0;
	}
};

Workometer.prototype.start = function () {
	if (!this.isResting) return;
	this._checkNewDay();
	this._countTime();
	this.time0 = this.lastWorkTime = Date.now();
	this.isResting = false;
};

Workometer.prototype._updateFatigue = function (pause) {
	this.fatigue = Math.max(this.fatigue - pause, 0);
};

// Called when we did not "stop" but timers could not fire (computer went on pause)
Workometer.prototype.backFromSleep = function (pause) {
	this._checkNewDay();
	this._updateFatigue(pause);
	this.time0 = this.lastWorkTime = Date.now();
	// NB: no need to adjust time counting since _countTime was not called during the pause
};

Workometer.prototype.stop = function () {
	if (this.isResting) return;
	this._countTime();
	this.time0 = this.lastWorkTime = Date.now();
	this.isResting = true;
};

Workometer.prototype._countTime = function () {
	var now = Date.now();
	var delta = now - this.time0;
	this.time0 = now;

	if (this.isResting) {
		this._checkNewDay();
		this._updateFatigue(delta);
	} else {
		this.taskWork += delta;
		this.todaysWork += delta;
		this.fatigue += delta / NONSTOP_PERIOD * REST_FOR_NONSTOP_PERIOD;
	}
	this.level = this.fatigue / REST_FOR_NONSTOP_PERIOD * 100;
};

//--- Task management

Workometer.prototype._loadCurTask = function (name) {
	this.curTask = new Task(this.tasks[name]);
	this.taskWork = this.curTask.timeWorked;
};

Workometer.prototype._saveCurTask = function () {
	this.curTask.updateTime(this.taskWork);
	this.tasks[this.curTask.name] = this.curTask.serialize();
};

Workometer.prototype._createTask = function () {
	this.curTask = new Task();
	this.taskWork = 0;
};

Workometer.prototype.newTask = function (name) {
	this._saveCurTask();
	this._createTask();
	if (name) this.curTask.rename(name);
	this._saveCurTask();
};

Workometer.prototype.deleteTask = function () {
	delete this.tasks[this.curTask.name];
	for (var name in this.tasks) {
		return this._loadCurTask(name);
	}
	this._createTask(); // create a new task if no more task exists
};

Workometer.prototype.switchTask = function (taskName) {
	this._saveCurTask();
	this._loadCurTask(taskName);
};

Workometer.prototype.renameTask = function (newName) {
	delete this.tasks[this.curTask.name];
	this.curTask.rename(newName);
};

Workometer.prototype.editTaskTime = function (time) {
	this.curTask.updateTime(time);
	this.taskWork = time;
};

Workometer.prototype.getTask = function () {
	return this.curTask;
};

//---

Workometer.prototype.getStatus = function (status) {
	this._countTime();

	status.isResting = this.isResting;
	status.taskName = this.curTask.name;
	status.taskWork = this.taskWork;
	status.todaysWork = this.todaysWork;
	status.fatigue = this.fatigue;
	status.level = this.level;
};

Workometer.prototype.getLevel = function () {
	return this.level;
};

},{"./Task":3}],5:[function(require,module,exports){
'use strict';

var pkg = require('../package.json');
var Ui = require('./ui/Ui');
var Workometer = require('./Workometer');
var nwUtil = require('./nwUtil');
var localPref = require('./localPref');

var SECOND = 1000, MINUTE = 60000;

var WORKING_REFRESH_FREQ = 1 * MINUTE;
var RESTING_REFRESH_FREQ = 1 * SECOND;

var WORKING_ALERT_FREQ = 15 * MINUTE;
var RESTING_ALERT_FREQ = 1 * MINUTE;

var AUTOPAUSE_AFTER_INACTION = 75 * MINUTE;

var ANNOYING_ALERT_LEVEL = 100; // percentage of gauge
var ANNOYING_ALERT_REPEAT_DELAY = 10 * MINUTE; // you can make the annoying alert quite for that much before it comes back


function App() {
	nwUtil.initialize();

	this.appName = pkg.name;
	this.appVersion = pkg.version;

	this.ui = this.workometer = null;
	this.isWorking = false;
	this.lastRefresh = Date.now();
	this.currentFreq = 0;
}

var app = new App();


App.prototype.initialize = function () {
	this.workometer = new Workometer(localPref.getValue('workometerState'));

	this.ui = new Ui(this, this.userEventHandler.bind(this));
	this.ui.createUi();

	this.refreshMethod = this.refresh.bind(this);
	this.refreshInterval = null;

	nwUtil.listenBeforeunload(this.terminate.bind(this));

	this._noteUserIsHere();
	this.toggle();
};

App.prototype.terminate = function () {
	this.workometer.stop();
	localPref.setValue('workometerState', this.workometer.serialize());
	localPref.terminate();
	nwUtil.terminate();
};

App.prototype.refresh = function () {
	var now = Date.now();
	var timeSinceLastRefresh = now - this.lastRefresh;
	this.lastRefresh = now;

	var extraPause = timeSinceLastRefresh - this.currentFreq;
	if (extraPause > 5 * SECOND) {
		this.workometer.backFromSleep(extraPause);
		if (!this.isWorking) return this.toggle();
	}

	this.ui.refresh();

	this.checkAlert();
};

App.prototype.checkAlert = function () {
	var now = Date.now();
	var timeSinceLastAlert = now - this.lastAlertTime;

	if (this.isWorking) {
		// Could be optional: this gives a chance to notice we forgot to switch task, etc.
		if (timeSinceLastAlert >= WORKING_ALERT_FREQ) {
			this.lastAlertTime = now;
			this.ui.showAlert(5);
		}
		var timeInactive = now - this.lastUserActionTime;
		// When user worked over the maximum of the gauge, we complain; he can "toggle" it off each time
		if (this.workometer.getLevel() >= ANNOYING_ALERT_LEVEL && timeInactive > ANNOYING_ALERT_REPEAT_DELAY) {
			this.ui.showAlert();
		}
		// If we did not see any user action in a while, declare this a break
		if (timeInactive > AUTOPAUSE_AFTER_INACTION) {
			this.toggle(); // NB: annoying alert stays on while we "rest" (user is most likely gone anyway)
		}
	} else {
		if (timeSinceLastAlert >= RESTING_ALERT_FREQ) {
			// Sometimes user came back but forgot to say it; we alert here for this case
			this.lastAlertTime = now;
			this.ui.showAlert(20);
		}
	}
};

App.prototype.toggle = function () {
	if (this.isWorking) {
		this.workometer.stop();
	} else {
		this.workometer.start();
	}
	this.isWorking = !this.isWorking;
	this.ui.setWorking(this.isWorking);
	this.refresh(); // 1st refresh right now

	window.clearInterval(this.refreshInterval);
	this.currentFreq = this.isWorking ? WORKING_REFRESH_FREQ : RESTING_REFRESH_FREQ;
	this.refreshInterval = window.setInterval(this.refreshMethod, this.currentFreq);
};

App.prototype._noteUserIsHere = function () {
	this.ui.stopAlert();
	this.lastUserActionTime = this.lastAlertTime = Date.now();
};

App.prototype.gotBreak = function () {
	this.workometer.gotBreak(5);
	this.refresh();
};

App.prototype.userPing = function () {
	if (!this.isWorking) this.toggle();
};

App.prototype.goOnPause = function () {
	if (this.isWorking) this.toggle();
};

App.prototype.userEventHandler = function (eventName) {
	this._noteUserIsHere();

	switch (eventName) {
	case 'pause': return this.goOnPause();
	case 'ping': return this.userPing();
	case 'gotBreak': return this.gotBreak();
	case 'exit': return this.terminate();
	}
};

app.initialize();

},{"../package.json":23,"./Workometer":4,"./localPref":6,"./nwUtil":8,"./ui/Ui":15}],6:[function(require,module,exports){
'use strict';

var log = require('./log');

var entryName = 'timeslicer.1';


function LocalPref() {
    this.saveTimeout = null;
    this.map = {};
    this._saveHandler = this._saveNow.bind(this);
    try {
        var json = window.localStorage.getItem(entryName);
        if (json) this.map = JSON.parse(json);
    } catch (err) {
        log.logError('Cannot load local preferences: ' + err);
    }
}

LocalPref.prototype.terminate = function () {
    if (this.saveTimeout) this._saveNow();
};

LocalPref.prototype._saveLater = function () {
    if (this.saveTimeout) return;
    this.saveTimeout = window.setTimeout(this._saveHandler, 60000);
};

LocalPref.prototype._saveNow = function () {
    window.clearTimeout(this.saveTimeout);
    this.saveTimeout = null;
    try {
        window.localStorage.setItem(entryName, JSON.stringify(this.map));
    } catch (err) {
        log.logError('Cannot save local preferences: ' + err);
    }
};

LocalPref.prototype.getValue = function (key, defValue) {
    var value = this.map[key];
    return value !== undefined ? value : defValue;
};

LocalPref.prototype.setValue = function (key, value) {
    this.map[key] = value;
    this._saveLater();
};

module.exports = new LocalPref();

},{"./log":7}],7:[function(require,module,exports){
'use strict';

var systemConsole = console;

var DEBUG = 0, INFO = 1, WARN = 2, ERROR = 3, FATAL = 4;

/** @class */
function Logger() {
    this.level = NaN;
    this.logfunc = null;

    this.DEBUG = 0;
    this.INFO = 1;
    this.WARN = 2;
    this.ERROR = 3;
    this.FATAL = 4;

    this.debugBreed = false;
    this.debugGroup = false;
}

Logger.prototype.setLevel = function (level) {
    if (level === this.level) return;
    this.level = level;
    this.debug = level <= DEBUG ? this.logDebug : null;
    this.info =  level <= INFO ?  this.logInfo : null;
    this.warn =  level <= WARN ?  this.logWarn : null;
    this.error = level <= ERROR ? this.logError : null;
    this.fatal = level <= FATAL ? this.logFatal : null;
};

Logger.prototype.setLogFunc = function (fn) {
    this.logfunc = fn;
};

Logger.prototype._newLogFn = function (lvl, consoleFn) {
    var self = this;
    return function (msg) {
        if (self.level > lvl) return;
        if (self.logfunc && !self.logfunc(lvl, msg)) return;
        consoleFn.call(systemConsole, msg);
    };
};

var log = module.exports = new Logger();

Logger.prototype.logDebug = log._newLogFn(DEBUG, systemConsole.debug);
Logger.prototype.logInfo =  log._newLogFn(INFO, systemConsole.info);
Logger.prototype.logWarn =  log._newLogFn(WARN, systemConsole.warn);
Logger.prototype.logError = log._newLogFn(ERROR, systemConsole.error);
Logger.prototype.logFatal = log._newLogFn(FATAL, systemConsole.error);

log.setLevel(INFO);

},{}],8:[function(require,module,exports){
'use strict';

var Arranger = require('./ui/Arranger');

var isInitialized = false;
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
    isInitialized = true;
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

},{"./ui/Arranger":9}],9:[function(require,module,exports){
'use strict';

var Dome = require('./Dome');

var MARGIN = 10; // px; margin from viewport's border


function Arranger(viewportHandler) {
    this.viewportHandler = viewportHandler;
    this.MARGIN = MARGIN;

    this.xMin = [];
    this.yMin = [];
    this.xMax = [];
    this.yMax = [];
}
module.exports = Arranger;


Arranger.prototype._tryToFit = function (r, trans) {
    var viewportWidth = this.viewportHandler.getWidth();
    var viewportHeight = this.viewportHandler.getHeight();

    var newX = Math.max(Math.min(r.left, viewportWidth - r.width - MARGIN), MARGIN);
    var newY = Math.max(Math.min(r.top, viewportHeight - r.height - MARGIN), MARGIN);

    trans[0] += newX - r.left;
    trans[1] += newY - r.top;
    r.left = newX;
    r.top = newY;
};

Arranger.prototype.addElement = function (elt) {
    elt.style.transform = null;
    var trans = [0, 0];
    var r = Dome.getRect(elt);
    this._tryToFit(r, trans);

    this.viewportHandler.addElement(r);

    this._tryToFit(r, trans);
    elt.style.transform = 'translate(' + trans[0] + 'px, ' + trans[1] + 'px)';

    this.xMin.push(r.left);
    this.yMin.push(r.top);
    this.xMax.push(r.left + r.width);
    this.yMax.push(r.top + r.height);
    elt._rect = r;
};

function remove(array, val) {
    var pos = array.indexOf(val);
    if (pos !== -1) array.splice(pos, 1);
}

Arranger.prototype.removeElement = function (elt) {
    var r = elt._rect;
    remove(this.xMin, r.left);
    remove(this.yMin, r.top);
    remove(this.xMax, r.left + r.width);
    remove(this.yMax, r.top + r.height);
    // var xOrig = Math.min.apply(null, this.xMin);
    // var yOrig = Math.min.apply(null, this.yMin);
    var xLimit = Math.max.apply(null, this.xMax);
    var yLimit = Math.max.apply(null, this.yMax);

    this.viewportHandler.reduce(xLimit, yLimit);
};

},{"./Dome":11}],10:[function(require,module,exports){
'use strict';

require('./contextMenu.less');
var Dome = require('./Dome');
var getText = require('./getText');
var PopupDlg = require('./PopupDlg');


function ContextMenu() {
    this.options = [];

    this.parent = document.body;
    this.menu = Dome.newDiv(null, 'contextMenu');
}
module.exports = ContextMenu;


function tapHandler() {
    this.contextMenu._close();
    if (this.action) this.action.call(this);
}

ContextMenu.prototype.addOption = function(label, action) {
    var option = Dome.newDiv(this.menu, 'menuOption').setText(label);
    option.action = action;
    option.contextMenu = this;
    Dome.tapBehavior(option, tapHandler);
    this.options.push(option);
    return option;
};

// NB: we don't actually attach to target but use it to position the menu
ContextMenu.prototype.attachMenu = function(target) {
    this.addOption(getText('cancelAction'), null);

    var r = Dome.getRect(target);
    this.menu.setStyle('left', r.left + r.width / 2 + 'px');
    this.menu.setStyle('top', r.top + r.height / 2 + 'px');

    PopupDlg.attachWithOverlay(this.menu, this.parent);
};

ContextMenu.prototype.detachMenu = function() {
    PopupDlg.detachWithOverlay(this.menu);
};

ContextMenu.prototype._close = function () {
    this.detachMenu();
};

},{"./Dome":11,"./PopupDlg":12,"./contextMenu.less":16,"./getText":18}],11:[function(require,module,exports){
'use strict';
/* eslint no-console: 0 */

var arranger = null;
var painter = null;
var curGroup = null;
var uniqueId = 1;


/**
 * @param {Painter} [aPainter]
 * @param {Arranger} [anArranger]
 */
Dome.init = function (aPainter, anArranger) {
    painter = aPainter;
    arranger = anArranger;
};

/**
 * @param {Dome|DOM} parent
 * @param {string} type - e.g. "div" or "button"
 * @param {className} className - class name for CSS; e.g. "mainDiv" or "logBox outputBox"
 * @param {string} name - "nameBox" or "#nameBox"; if starts with "#" element is added to current DomeGroup
 */
function Dome(parent, type, className, name) {
    this.type = type;
    var elt = this.elt = document.createElement(type);
    this.isFloating = false;

    if (name && name[0] === '#') {
        curGroup.add(name.substr(1), this);
        // Some class names are built from name so "#" could be in className too
        if (className[0] === '#') className = className.substr(1);
    }
    if (className) elt.className = className;
    if (painter) painter.paint(elt, className);
    if (parent) {
        (parent instanceof Dome ? parent.elt : parent).appendChild(elt);
    }
}
module.exports = Dome;


Dome.prototype.appendTo = function (parent, isFloating) {
    (parent instanceof Dome ? parent.elt : parent).appendChild(this.elt);

    this.isFloating = isFloating;
    if (arranger && isFloating) arranger.addElement(this.elt);
};

Dome.removeChild = function (parent, dome) {
    if (arranger && dome.isFloating) arranger.removeElement(dome.elt);
    if (parent instanceof Dome) parent = parent.elt;
    parent.removeChild(dome.elt);
};
Dome.prototype.removeChild = function (child) { Dome.removeChild(this, child); };


// Setters

Dome.prototype.setText = function (text) { this.elt.textContent = text; return this; };
Dome.prototype.setHtml = function (html) { this.elt.innerHTML = html; return this; };
Dome.prototype.setAttribute = function (name, val) { this.elt.setAttribute(name, val); return this; };
Dome.prototype.setStyle = function (prop, value) { this.elt.style[prop] = value; return this; };

Dome.prototype.setVisible = function (show) {
    if (show === this.isVisible()) return this;
    this.elt.style.display = show ? '' : 'none';
    this._isVisible = !!show;
    if (arranger && this.isFloating) {
        if (show) arranger.addElement(this.elt);
        else arranger.removeElement(this.elt);
    }
    return this;
};

Dome.prototype.isVisible = function () {
    return this._isVisible || this._isVisible === undefined; // default is visible
};

Dome.prototype.setEnabled = function (enable) {
    this.elt.disabled = !enable;
    this.toggleClass('disabled', !enable);
    return this;
};

// Getters

Dome.prototype.text = function () { return this.elt.textContent; };
Dome.prototype.html = function () { return this.elt.innerHTML; };
Dome.prototype.value = function () { return this.elt.value; };
Dome.prototype.isChecked = function () { return this.elt.checked; }; // for checkboxes
Dome.prototype.getDomElt = function () { return this.elt; };

Dome.prototype.clear = function () { this.elt.innerHTML = ''; };

Dome.prototype.on = function (eventName, fn) {
    var self = this;
    this.elt.addEventListener(eventName, function (ev) { fn.call(self, ev); });
};

Dome.prototype.toggleClass = function (className, enable) {
    var elt = this.elt;
    var classes = elt.className, spClasses = ' ' + classes + ' ';
    var spClassName = ' ' + className + ' ';
    var pos = spClasses.indexOf(spClassName);

    if (enable) {
        if (pos >= 0) return;
        if (painter) painter.toggle(elt, className, enable);
        elt.className = classes + ' ' + className;
    } else {
        if (pos < 0) return;
        elt.className = spClasses.replace(spClassName, ' ').trim();
        if (painter) painter.toggle(elt, className, enable);
    }
};

Dome.prototype.scrollToBottom = function () {
    this.elt.scrollTop = this.elt.scrollHeight;
};

Dome.newDiv = function (parent, className, name) {
    return new Dome(parent, 'div', className, name || className);
};
Dome.prototype.newDiv = function (className, name) {
    return new Dome(this, 'div', className, name || className);
};

Dome.newButton = function (parent, name, label, action) {
    var button = new Dome(parent, 'button', name + 'Button', name);
    if (label) button.elt.innerText = label;
    button.on('click', action);
    return button;
};

Dome.newGfxButton = function (parent, name, action) {
    var btn = Dome.newButton(parent, name, null, action);
    btn.newDiv(name + 'BtnIcon btnIcon');
    return btn;
};

Dome.tapBehavior = function (elt, action) {
    elt.on('click', function (ev) {
        ev.stopPropagation();
        action.call(this);
    });
};

Dome.newLink = function (parent, name, label, url) {
    var link = new Dome(parent, 'a', name + 'Link', name);
    link.setAttribute('href', url);
    link.setText(label);
    return link;
};

Dome.newLabel = function (parent, name, label) {
    return new Dome(parent, 'div', name, name).setText(label);
};

Dome.newBreak = function (parent) {
    return new Dome(parent, 'br');
};

Dome.newInput = function (parent, name, label, init) {
    var labelName = name + 'Label';
    Dome.newLabel(parent, labelName + ' inputLbl', label, labelName);
    var input = new Dome(parent, 'input', name + 'Input inputBox', name);
    if (init !== undefined) input.elt.value = init;
    return input;
};

/** var myCheckbox = Dome.newCheckbox(testDiv, 'debug', 'Debug', null, true);
 *  ...
 *  if (myCheckbox.isChecked()) ...
 */
Dome.newCheckbox = function (parent, name, label, value, init) {
    var div = new Dome(parent, 'div', name + 'Div chkBoxDiv');
    var input = new Dome(div, 'input', name + 'ChkBox chkBox', name);
    var inp = input.elt;
    inp.type = 'checkbox';
    inp.name = name;
    if (value !== undefined) inp.value = value;
    inp.id = name + 'ChkBox' + (value !== undefined ? value : uniqueId++);
    if (init) inp.checked = true;

    new Dome(div, 'label', name + 'ChkLabel chkLbl', name)
        .setText(label)
        .setAttribute('for', inp.id);
    return input;
};

/** var myOptions = Dome.newRadio(parent, 'stoneColor', ['white', 'black'], null, 'white');
 *  ...
 *  var result = Dome.getRadioValue(myOptions);
 */
Dome.newRadio = function (parent, name, labels, values, init) {
    if (!values) values = labels;
    var opts = [];
    for (var i = 0; i < labels.length; i++) {
        var input = opts[i] = new Dome(parent, 'input', name + 'RadioBtn radioBtn', name);
        var inp = input.elt;
        inp.type = 'radio';
        inp.name = name;
        inp.value = values[i];
        inp.id = name + 'Radio' + values[i];
        if (values[i] === init) inp.checked = true;

        new Dome(parent, 'label', name + 'RadioLabel radioLbl', name)
            .setText(labels[i])
            .setAttribute('for', inp.id);
    }
    return opts;
};

/** @param {array} opts - the array of options returned when you created the radio buttons with newRadio */
Dome.getRadioValue = function (opts) {
    for (var i = 0; i < opts.length; i++) {
        if (opts[i].elt.checked) return opts[i].elt.value;
    }
};

/** var mySelect = Dome.newDropdown(parent, 'stoneColor', ['white', 'black'], null, 'white')
 *  ...
 *  var result = mySelect.value()
 */
Dome.newDropdown = function (parent, name, labels, values, init) {
    if (!values) values = labels;
    var select = new Dome(parent, 'select', name + 'DropDwn dropDwn', name);
    select.values = values;
    var cur = 0;
    for (var i = 0; i < labels.length; i++) {
        var opt = new Dome(select, 'option').elt;
        opt.value = values[i];
        opt.textContent = labels[i];
        if (values[i] === init) cur = i;
    }
    select.elt.selectedIndex = cur;
    return select;
};

Dome.prototype.select = function (value) {
    var ndx = this.values.indexOf(value);
    if (ndx !== -1) this.elt.selectedIndex = ndx;
};

//---Rect helpers

function Rect(left, top, width, height) {
    this.left = left;
    this.top = top;
    this.width = width;
    this.height = height;
}

Dome.getRect = function (eltOrDome) {
    var r = (eltOrDome.elt || eltOrDome).getBoundingClientRect();
    return new Rect(r.left, r.top, r.width, r.height);
};

//---Group helpers

function DomeGroup() {
    this.ctrl = {};
}

Dome.newGroup = function () {
    curGroup = new DomeGroup();
    return curGroup;
};

DomeGroup.prototype.add = function (name, dome) { this.ctrl[name] = dome; };
DomeGroup.prototype.get = function (name) { return this.ctrl[name]; };

DomeGroup.prototype.setEnabled = function (names, enabled, except) {
    if (names === 'ALL') names = Object.keys(this.ctrl);
    for (var i = 0; i < names.length; i++) {
        if (except && except.indexOf(names[i]) !== -1) continue;
        var elt = this.ctrl[names[i]];
        if (!elt) { console.error('Invalid control name:', names[i]); continue; }
        elt.setEnabled(enabled);
    }
};

DomeGroup.prototype.setVisible = function (names, show, except) {
    if (names === 'ALL') names = Object.keys(this.ctrl);
    for (var i = 0; i < names.length; i++) {
        if (except && except.indexOf(names[i]) !== -1) continue;
        var elt = this.ctrl[names[i]];
        if (!elt) { console.error('Invalid control name:', names[i]); continue; }
        elt.setVisible(show);
    }
};

//---Misc

Dome.setPageTitle = function (title) {
    document.head.getElementsByTagName('title')[0].textContent = title;
};

// Return the selected text if any - null if there is none
Dome.getSelectedText = function () {
    var selection = window.getSelection();
    if (!selection.rangeCount) return null;
    var range = selection.getRangeAt(0);
    var text = range.startContainer.data;
    if (!text) return null;

    return text.substring(range.startOffset, range.endOffset);
};

Dome.downloadFile = function (content, filename) {
    var file = new Blob([content]);
    var a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = filename;
    a.click();
};

// e.g. var fi = Dome.newInput(parent, 'loadGame', label).setAttribute('type', 'file');
// if (fi.hasFile()) fi.uploadFile(function (content) {...});
Dome.prototype.hasFile = function () {
    var files = this.elt.files;
    return files && files.length > 0;
};

Dome.prototype.uploadFile = function (cb) {
    var files = this.elt.files;
    if (!files) return console.error('Invalid field type for uploadFile: ' + this.type);
    if (!files.length) return false;
    var fr = new FileReader();
    fr.readAsText(files[0]);
    fr.onloadend = function () {
        return cb(fr.result);
    };
    return true;
};

},{}],12:[function(require,module,exports){
'use strict';
require('./popupDlg.less');
var Dome = require('./Dome');
var getText = require('./getText');


function action() {
    // "this" is the button
    var dlg = this.dlg;
    if (dlg.options) dlg.options.choice = this.id;

    PopupDlg.detachWithOverlay(dlg.dialog);

    if (dlg.validateFn) dlg.validateFn(dlg.options);
}

function newButton(div, dlg, label, id) {
    var btn = Dome.newButton(div, 'popupDlg', label, action);
    btn.dlg = dlg;
    btn.id = id;
}

function PopupDlg(parent, msg, title, options, validateFn) {
    this.parent = parent || document.body;
    this.options = options;
    this.validateFn = validateFn;

    var dialog = this.dialog = Dome.newDiv(null, 'popupDlg dialog');
    dialog.newDiv('dialogTitle').setText(title || getText('problem'));

    var content = dialog.newDiv('content');
    Dome.newLabel(content, 'message', msg);

    var btns = (options && options.buttons) || [getText('OK')];
    var btnDiv = dialog.newDiv('btnDiv');
    for (var i = 0; i < btns.length; i++) {
        newButton(btnDiv, this, btns[i], i);
    }

    PopupDlg.attachWithOverlay(this.dialog, this.parent);
}
module.exports = PopupDlg;


function newOverlay(parent) {
    var overlay = Dome.newDiv(null, 'popupOverlay');

    if (parent) {
        parent = parent.elt || parent;
        overlay.setStyle('left', parent.offsetLeft + 'px');
        overlay.setStyle('top', parent.offsetTop + 'px');
        overlay.setStyle('height', parent.scrollHeight + 'px');
    }

    return overlay;
}

PopupDlg.attachWithOverlay = function (dome, parent) {
    var overlay = dome.overlay = newOverlay();
    overlay.parent = parent;
    overlay.appendTo(parent);
    dome.appendTo(overlay, /*isFloating=*/true);
    overlay.setStyle('opacity', 1);
};

PopupDlg.detachWithOverlay = function (dome) {
    dome.overlay.setStyle('opacity', 0);
    window.setTimeout(function () {
        dome.setVisible(false);
        Dome.removeChild(dome.overlay.parent, dome.overlay);
    }, 300);
};

},{"./Dome":11,"./getText":18,"./popupDlg.less":20}],13:[function(require,module,exports){
'use strict';
require('./taskDlg.less');
var Dome = require('./Dome');
var getText = require('./getText');
var PopupDlg = require('./PopupDlg');
var util = require('./util');


function TaskDlg(mode, ui, cb) {
    var isNewMode = mode === 'new';
    this.workometer = ui.app.workometer;
    this.task = this.workometer.getTask();
    this.cb = cb;
    this.oldName = isNewMode ? '' : this.task.getName();
    this.oldTime = util.ms2str(this.task.getTimeWorked());

    var dialog = this.dialog = Dome.newDiv(null, 'taskDlg dialog');
    dialog.newDiv('dialogTitle').setText(isNewMode ? getText('newTaskTitle') : getText('editTaskTitle'));

    var content = dialog.newDiv('content');

    this.name = Dome.newInput(content, 'name', getText('taskName') + ':', this.oldName);
    if (!isNewMode) this.time = Dome.newInput(content, 'time', getText('taskTime') + ':', this.oldTime);

    var btnDiv = dialog.newDiv('btnDiv');
    if (isNewMode) this._newButton(btnDiv, 'newTask', getText('newTask'));
    if (!isNewMode && this.oldName) this._newButton(btnDiv, 'delTask', getText('delTask'));
    if (!isNewMode) this._newButton(btnDiv, 'edit', getText('OK'));
    this._newButton(btnDiv, 'cancel', getText('cancelAction'));

    PopupDlg.attachWithOverlay(this.dialog, document.body);
    this.name.elt.focus();
}
module.exports = TaskDlg;


function btnHandler() {
    this.dlg._validate(this.action);
}

TaskDlg.prototype._newButton = function (parent, action, label) {
    var btn = Dome.newButton(parent, action, label, btnHandler);
    btn.action = action;
    btn.dlg = this;
};

TaskDlg.prototype._validate = function (action) {
    var newName = this.name.value();

    switch (action) {
    case 'edit':
        if (newName && newName !== this.oldName) {
            this.workometer.renameTask(newName);
        }
        var newTime = this.time.value();
        if (newTime !== this.oldTime) {
            var newTimeMs = util.str2ms(newTime);
            if (!newTimeMs && newTimeMs !== 0) {
                return new PopupDlg(this.dialog, getText('invalidValue') + ': ' + newTime);
            }
            this.workometer.editTaskTime(newTimeMs);
        }
        break;
    case 'newTask':
        this.workometer.newTask(newName);
        break;
    case 'delTask':
        var question = getText('delTask') + ': ' + this.oldName + '?';
        var options = { buttons: [getText('cancelAction'), getText('OK')] };
        var self = this;
        return new PopupDlg(this.dialog, question, getText('confirmTitle'), options, function (options) {
            if (!options.choice) return; 
            self.workometer.deleteTask();
            self._close();
        });
    case 'cancel':
        break;
    }

    this._close();
};

TaskDlg.prototype._close = function () {
    PopupDlg.detachWithOverlay(this.dialog);
    this.cb();
};

},{"./Dome":11,"./PopupDlg":12,"./getText":18,"./taskDlg.less":21,"./util":22}],14:[function(require,module,exports){
'use strict';

var DISTANCE_THRESHOLD = 10; // px
var MIN_MOVE_DELAY = 50; // ms, how often do we emit a drag event
var HOLD_TIME_THRESHOLD = 300; // how long you must hold before dragging

/**
 * How long you must drag to be a real drag.
 * Under this, the move is considered a slow, undecided tap.
 * This is to prevent mistap when holding & releasing on same spot just long enough to start a drag.
 */
var MIN_DRAG_TIME = 500;

var MOUSE_BTN_MAIN = 0;


function TouchManager() {
    this.startX = this.startY = 0;
    this.holding = this.dragging = false;
    this.target = null;
    this.touchCount = this.startTime = this.lastMoveTime = 0;
}

var tm = module.exports = new TouchManager();


function touchstartHandler(ev) {
    var target = ev.currentTarget;
    tm.touchCount += ev.changedTouches.length;
    if (tm.touchCount > 1) {
        return tm._cancelDrag(target);
    }
    tm._onTouchStart(ev.changedTouches[0], target);
}

function touchendHandler(ev) {
    tm.touchCount -= ev.changedTouches.length;
    if (tm.touchCount > 0) return console.warn('Extra touchend count?', ev);

    if (tm._onTouchEnd(ev.changedTouches[0], tm.target)) {
        ev.preventDefault();
    }
}

function touchmoveHandler(ev) {
    if (ev.changedTouches.length > 1) return tm._cancelDrag(tm.target);

    if (tm._onTouchMove(ev.changedTouches[0], tm.target)) {
        ev.preventDefault();
    }
}

function touchcancelHandler(ev) {
    tm.touchCount -= ev.changedTouches.length;
    tm._cancelDrag(tm.target);
}

function mousedownHandler(ev) {
    if (ev.button !== MOUSE_BTN_MAIN) return;
    tm._onTouchStart(ev, ev.currentTarget);
}

function mouseupHandler(ev) {
    if (ev.button !== MOUSE_BTN_MAIN) return;
    if (tm._onTouchEnd(ev, tm.target)) {
        ev.preventDefault();
    }
}

function mousemoveHandler(ev) {
    if (tm._onTouchMove(ev, tm.target)) {
        ev.preventDefault();
    }
}

TouchManager.prototype._listen = function (target, on) {
    if (on) {
        if (this.target !== null) console.error('Forgot to stop listening on', this.target);
        this.holding = true;
        this.target = target;
        target.addEventListener('touchmove', touchmoveHandler);
        target.addEventListener('touchend', touchendHandler);
        target.addEventListener('touchcancel', touchcancelHandler);
        document.addEventListener('mousemove', mousemoveHandler);
        document.addEventListener('mouseup', mouseupHandler);
    } else {
        if (this.target === null) return console.warn('Not listening anyway');
        this.holding = false;
        this.target = null;
        target.removeEventListener('touchmove', touchmoveHandler);
        target.removeEventListener('touchend', touchendHandler);
        target.removeEventListener('touchcancel', touchcancelHandler);
        document.removeEventListener('mousemove', mousemoveHandler);
        document.removeEventListener('mouseup', mouseupHandler);
    }
};

TouchManager.prototype._onTouchStart = function (ev, target) {
    this._listen(target, true);
    this.holding = true;
    this.startX = ev.clientX;
    this.startY = ev.clientY;
    this.startTime = Date.now();
    var self = this;
    if (this.holdTimeout) window.clearTimeout(this.holdTimeout);
    this.holdTimeout = window.setTimeout(function () {
        self.holdTimeout = null;
        if (self.holding && !self.dragging) self._startDrag(ev, target);
    }, HOLD_TIME_THRESHOLD);
};

TouchManager.prototype._startDrag = function (ev, target) {
    this.dragging = true;
    this.startTime = Date.now();
    target.touchHandlerFn('dragStart', ev.pageX - target.offsetLeft, ev.pageY - target.offsetTop);
};

TouchManager.prototype._cancelDrag = function (target) {
    this.touchCount = 0;
    this._listen(target, false);
    if (this.dragging) {
        this.dragging = false;
        target.touchHandlerFn('dragCancel');
    }
    return true;
};

TouchManager.prototype._onTouchMove = function (ev, target) {
    var now = Date.now();
    if (now - this.lastMoveTime < MIN_MOVE_DELAY) return true;
    this.lastMoveTime = now;

    if (!this.dragging) {
        if (Math.abs(ev.clientX - this.startX) + Math.abs(ev.clientY - this.startY) < DISTANCE_THRESHOLD) {
            return false;
        }
        if (now - this.startTime < HOLD_TIME_THRESHOLD) {
            this._listen(target, false);
            return false;
        }
        return this._startDrag(ev, target);
    }
    target.touchHandlerFn('drag', ev.pageX - target.offsetLeft, ev.pageY - target.offsetTop);
    return true;
};

TouchManager.prototype._onTouchEnd = function (ev, target) {
    // Did we drag long enough?
    if (this.dragging && Date.now() - this.startTime < MIN_DRAG_TIME) {
        return this._cancelDrag(target);
    }

    var eventName = this.dragging ? 'dragEnd' : 'tap';
    target.touchHandlerFn(eventName, ev.pageX - target.offsetLeft, ev.pageY - target.offsetTop);
    this._listen(target, false);
    this.dragging = false;
    return true;
};

/** Starts to listen on given element.
 * @param {dom} elt
 * @param {func} handlerFn - handlerFn(eventName, x, y)
 *    With eventName in: tap, dragStart, drag, dragEnd, dragCancel
 */
TouchManager.prototype.listenOn = function (elt, handlerFn) {
    elt.touchHandlerFn = handlerFn;

    elt.addEventListener('touchstart', touchstartHandler);
    elt.addEventListener('mousedown', mousedownHandler);
};

},{}],15:[function(require,module,exports){
'use strict';

require('./mainUi.less');
var ContextMenu = require('./ContextMenu');
var Dome = require('./Dome');
var getText = require('./getText');
var nwUtil = require('../nwUtil');
var TaskDlg = require('./TaskDlg');
var touchManager = require('./TouchManager');
var util = require('./util');

var MAX_COLOR_BAND = 33;

var TODAY = 0, TASK = 1;
var DISPLAY_TYPES = [TODAY, TASK];


function Ui(app, eventHandler) {
    this.app = app;
    this.eventHandler = eventHandler;

    this.curDisplay = TODAY;

    this.alertInterval = null;
    this.alertOn = false;
    this.flashCount = 0;

    Dome.init(null, nwUtil.getArranger());
}
module.exports = Ui;


/** This is the entry point for starting the app */
Ui.prototype.createUi = function () {
    Dome.setPageTitle(this.app.appName);
    var mainDiv = Dome.newDiv(document.body, 'mainDiv');
    this._createGauge(mainDiv);
    this._createButtons(mainDiv);
};

Ui.prototype._addTapBehavior = function (div, eventName) {
    var handler = function (eventName) { this.eventHandler(eventName); }.bind(this, eventName);
    touchManager.listenOn(div.elt, handler);
};

Ui.prototype._createGauge = function (parent) {
    var gauge = this.gauge = parent.newDiv('gauge');
    this.green = gauge.newDiv('colorBand green');
    this.amber = gauge.newDiv('colorBand amber');
    this.red = gauge.newDiv('colorBand red');
    this.label = gauge.newDiv('label');

    touchManager.listenOn(gauge.elt, this._switchDisplay.bind(this));
};

Ui.prototype._newButton = function (parent, className, label, action) {
    var btn = parent.newDiv(className).setText(label);
    this._addTapBehavior(btn, action);
    return btn;
};

Ui.prototype._createButtons = function (parent) {
    this.pauseBtn = this._newButton(parent, 'pauseBtn', getText('pauseBtn'), 'pause');
    this.pingBtn = this._newButton(parent, 'pingBtn', getText('pingBtn'), 'ping');
    this.settingsBtn = Dome.newGfxButton(parent, 'settings', this._showSettingsMenu.bind(this));
};

Ui.prototype._showSettingsMenu = function () {
    var cm = new ContextMenu();
    cm.addOption(getText('gotBreakAction'), this.eventHandler.bind(this, 'gotBreak'));
    cm.addOption(getText('taskAction'), this._showTaskMenu.bind(this));
    if (nwUtil.isNw()) cm.addOption(getText('exitAction'), this.eventHandler.bind(this, 'exit'));
    cm.attachMenu(this.settingsBtn);
};

function taskSwitchHandler() {
    // "this" is the menu option
    var self = this.ui;
    self.app.workometer.switchTask(this.taskName);
    self.refresh();
}

Ui.prototype._showTaskMenu = function () {
    var cm = new ContextMenu();
    cm.addOption(getText('newTaskAction'), this._showTaskDlg.bind(this, 'new'));
    cm.addOption(getText('editTaskAction'), this._showTaskDlg.bind(this, 'edit'));

    var workometer = this.app.workometer;
    for (var name in workometer.tasks) {
        var option = cm.addOption(name || getText('unnamedTask'), taskSwitchHandler);
        option.ui = this;
        option.taskName = name;
    }

    cm.attachMenu(this.settingsBtn);
};

Ui.prototype.setWorking = function (isWorking) {
    this.pauseBtn.setVisible(isWorking);
    this.pingBtn.setVisible(!isWorking);
};

Ui.prototype.displayGauge = function (value, label) {
    var green = Math.min(value, MAX_COLOR_BAND);
    value -= green;
    var amber = Math.min(value, MAX_COLOR_BAND);
    value -= amber;
    var red = Math.min(value, MAX_COLOR_BAND);
    var isFull = red === MAX_COLOR_BAND;

    this.green.setStyle('width', green + '%');
    this.amber.setStyle('width', amber + '%');
    this.red.setStyle('width', isFull ? null : red + '%');

    this.gauge.toggleClass('full', isFull);

    this.label.setText(label);
};

Ui.prototype.refresh = function () {
    var status = this.workStatus = this.workStatus || {};
    this.app.workometer.getStatus(status);

    var text;
    if (status.isResting) {
        text = getText('resting') + ': ' + util.ms2str(status.fatigue);
    } else {
        switch (this.curDisplay) {
        case TODAY:
            text = getText('todaysWork') + ': ' + util.ms2str(status.todaysWork);
            break;
        case TASK:
            var taskName = status.taskName || getText('unnamedTask');
            text = taskName + ': ' + util.ms2str(status.taskWork);
            break;
        }
    }

    this.displayGauge(status.level, text);
};

Ui.prototype._switchDisplay = function () {
    this.curDisplay = (this.curDisplay + 1) % DISPLAY_TYPES.length;
    this.refresh();
};

Ui.prototype._flashAlert = function () {
    var alertOn = this.alertOn = !this.alertOn;
    this.gauge.toggleClass('alert', alertOn);
    if (alertOn) return;

    if (!this.flashCount) return; // infinite alert
    this.flashCount--;
    if (this.flashCount === 0) {
        window.clearInterval(this.alertInterval);
        this.alertInterval = null;
    }
};

Ui.prototype.showAlert = function (numFlash) {
    if (this.alertInterval && !this.flashCount) return; // already in infinite alert mode

    this.flashCount = numFlash;

    if (!this.alertInterval) {
        this.alertInterval = window.setInterval(this._flashAlert.bind(this), 70);
    }
};

Ui.prototype.stopAlert = function () {
    this.flashCount = 1;
};

Ui.prototype._showTaskDlg = function (mode) {
    new TaskDlg(mode, this, this.refresh.bind(this));
};

},{"../nwUtil":8,"./ContextMenu":10,"./Dome":11,"./TaskDlg":13,"./TouchManager":14,"./getText":18,"./mainUi.less":19,"./util":22}],16:[function(require,module,exports){
var css = ".contextMenu {\n  position: relative;\n  width: 150px;\n  background-color: rgba(120, 120, 120, 0.2);\n  border-radius: 7px;\n  border: 1px solid #58636d;\n}\n.contextMenu .menuOption {\n  margin: 1px 1px 0 1px;\n  padding: 11px;\n  border-radius: 7px;\n  background-color: rgba(0, 0, 0, 0.7);\n  color: #e4e4e4;\n}\n";(require('lessify'))(css); module.exports = css;
},{"lessify":2}],17:[function(require,module,exports){
module.exports={
    "pauseBtn": "Bye!",
    "pingBtn": "I am here",
    "hourShort": "h",
    "minuteShort": "min",
    "todaysWork": "today",
    "unnamedTask": "(default task)",
    "resting": "resting",

    "gotBreakAction": "Got a break",
    "taskAction": "Tasks...",
    "exitAction": "Exit",
    "newTaskAction": "New task...",
    "editTaskAction": "Edit task...",
    "cancelAction": "Cancel",
    "confirmTitle": "Confirm",

    "OK": "OK",
    "editTaskTitle": "Edit Task",
    "newTaskTitle": "New Task",
    "newTask": "Create new task",
    "delTask": "Delete task",
    "taskName": "Name",
    "taskTime": "Worked time",
    "invalidValue": "Invalid value",
    "problem": "Problem",
}
},{}],18:[function(require,module,exports){
'use strict';

var dict = require('./en_dict.json');

function getText(id) {
    return dict[id];
}

module.exports = getText;

},{"./en_dict.json":17}],19:[function(require,module,exports){
var css = "body {\n  -webkit-touch-callout: none;\n  /* iOS Safari */\n  -webkit-user-select: none;\n  /* Chrome/Safari/Opera */\n  -moz-user-select: none;\n  /* Firefox */\n  -ms-user-select: none;\n  /* Internet Explorer/Edge */\n  user-select: none;\n  /* Non-prefixed version, currently not supported by any browser */\n  -webkit-app-region: drag;\n  background: transparent;\n  font-family: \"Arial\";\n  font-size: 16px;\n  margin: 0px;\n}\n::-webkit-scrollbar {\n  -webkit-appearance: none;\n  width: 7px;\n  height: 7px;\n}\n::-webkit-scrollbar-track {\n  -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.2);\n  -webkit-border-radius: 10px;\n  border-radius: 7px;\n  margin: 1px;\n}\n::-webkit-scrollbar-thumb {\n  border-radius: 7px;\n  background-color: rgba(0, 0, 0, 0.5);\n  -webkit-box-shadow: 0 0 1px rgba(255, 255, 255, 0.5);\n}\n.dialog {\n  padding: 10px;\n  background-color: #ddd;\n  color: #000;\n  border-radius: 7px;\n}\n.dialogTitle {\n  font-size: 30px;\n  background-color: #ccc;\n  color: #000;\n  border: 1px solid #afafaf;\n  border-radius: 7px;\n  margin: -6px -6px 0px -6px;\n  padding: 3px 0px 3px 6px;\n}\n.mainDiv {\n  background: rgba(76, 97, 94, 0.5);\n  border-radius: 7px;\n  border: 1px solid rgba(0, 78, 255, 0.32);\n  padding-left: 12px;\n  width: 392px;\n}\n.mainDiv .gauge {\n  -webkit-app-region: no-drag;\n  display: inline-block;\n  position: relative;\n  margin: 5px;\n  background-color: #000;\n  border-radius: 7px;\n  width: 210px;\n  height: 30px;\n  box-sizing: border-box;\n  padding: 4px 0 0 4px;\n}\n.mainDiv .gauge.alert {\n  background-color: #a06000;\n}\n.mainDiv .gauge .colorBand {\n  display: inline-block;\n  height: calc(100% - 2px);\n}\n.mainDiv .gauge .colorBand.green {\n  border-radius: 5px 0 0 5px;\n  background-color: green;\n}\n.mainDiv .gauge .colorBand.amber {\n  background-color: #A17F13;\n}\n.mainDiv .gauge .colorBand.red {\n  background-color: #A72300;\n}\n.mainDiv .gauge.full .colorBand {\n  background-color: #A72300;\n}\n.mainDiv .gauge.full .colorBand.red {\n  border-radius: 0 5px 5px 0;\n  width: calc(34% - 2px);\n}\n.mainDiv .gauge.alert .colorBand {\n  background-color: red;\n}\n.mainDiv .gauge .label {\n  position: absolute;\n  top: 1px;\n  line-height: 30px;\n  width: 100%;\n  text-align: center;\n  color: #a7a7a7;\n  text-shadow: 1px 1px 1px black;\n}\n.mainDiv .pingBtn,\n.mainDiv .pauseBtn {\n  -webkit-app-region: no-drag;\n  display: inline-block;\n  vertical-align: top;\n  margin: 5px;\n  width: 100px;\n  height: 30px;\n  background-color: #000;\n  border-radius: 7px;\n  color: #666;\n  line-height: 30px;\n  text-align: center;\n  -webkit-touch-callout: none;\n  /* iOS Safari */\n  -webkit-user-select: none;\n  /* Chrome/Safari/Opera */\n  -moz-user-select: none;\n  /* Firefox */\n  -ms-user-select: none;\n  /* Internet Explorer/Edge */\n  user-select: none;\n  /* Non-prefixed version, currently not supported by any browser */\n}\n.mainDiv .settingsButton {\n  -webkit-app-region: no-drag;\n  display: inline-block;\n  vertical-align: top;\n  margin: 5px;\n  width: 40px;\n  height: 30px;\n  background-color: #000;\n  border-radius: 7px;\n  border-color: #74b5a6;\n}\n.mainDiv .settingsButton .settingsBtnIcon {\n  height: 100%;\n  background: url(\"assets/settings.png\") 50% no-repeat;\n  -webkit-filter: sepia(0.9) brightness(2);\n  background-size: auto 95%;\n}\n";(require('lessify'))(css); module.exports = css;
},{"lessify":2}],20:[function(require,module,exports){
var css = ".popupOverlay {\n  z-index: 2000;\n  position: absolute;\n  left: 0;\n  top: 0;\n  width: 100%;\n  height: 100%;\n  border-radius: 7px;\n  background-color: rgba(0, 0, 0, 0.4);\n  transition: opacity 300ms ease-out;\n  opacity: 0;\n}\n.popupDlg {\n  position: relative;\n  margin: 30px auto;\n  width: 305px;\n}\n.popupDlg .content {\n  padding: 20px;\n  white-space: pre-wrap;\n  word-wrap: break-word;\n}\n.popupDlg .btnDiv {\n  width: 100%;\n  display: inline-block;\n  margin: -10px 0 -10px 0;\n}\n.popupDlg .btnDiv .popupDlgButton {\n  float: right;\n}\n";(require('lessify'))(css); module.exports = css;
},{"lessify":2}],21:[function(require,module,exports){
var css = ".nameInput {\n  margin-top: 1px;\n}\n.inputLbl {\n  margin-top: 5px;\n}\n.taskDlg {\n  position: relative;\n  margin: 7px auto;\n  width: 350px;\n}\n.taskDlg .content {\n  padding: 20px;\n  white-space: pre-wrap;\n  word-wrap: break-word;\n}\n.taskDlg .btnDiv {\n  width: 100%;\n  margin: -10px 0 -10px 0;\n  display: inline-block;\n}\n.taskDlg button {\n  margin: 5px;\n  min-width: 100px;\n  height: 40px;\n  border-radius: 7px;\n  border-color: #74b5a6;\n  background-color: #aaa;\n}\n.taskDlg .newTaskButton,\n.taskDlg .cancelButton,\n.taskDlg .editButton {\n  float: right;\n}\n";(require('lessify'))(css); module.exports = css;
},{"lessify":2}],22:[function(require,module,exports){
'use strict';

var getText = require('./getText');

var MINUTE = 60000, HOUR = 3600000;


// e.g. ms2str(60000) => "1min"; ms2str(3600000) => "1h00"
exports.ms2str = function (ms) {
    var durationInMinutes = Math.round(ms / MINUTE);
    var hour = Math.floor(durationInMinutes / 60);

    if (hour) {
        var min = durationInMinutes - hour * 60;
        return hour + getText('hourShort') + ('0' + min).slice(-2);
    } else {
        return durationInMinutes + getText('minuteShort');
    }
};

// e.g. str2ms('1h00') => 3600000; str2ms('2min') => 120000
exports.str2ms = function (str) {
    var hhmm = str.split(getText('hourShort'));
    if (hhmm.length > 1) {
        return parseInt(hhmm[0]) * HOUR + (hhmm[1] ? parseInt(hhmm[1]) * MINUTE : 0);
    } else {
        return parseInt(hhmm[0]) * MINUTE;
    }
};

},{"./getText":18}],23:[function(require,module,exports){
module.exports={
    "main": "index.html",
    "name": "timeslicer",
    "version": "0.1.0",
    "dependencies": {
    },
    "devDependencies": {
        "browserify": "~13.0.0",
        "lessify": "~1.0.1",
        "watchify": "^3.2.2"
    },
    "scripts": {
        "build": "watchify js/app.js --no-detect-globals --bare -t lessify -o build/build.js -v",
        "test": "watchify js/test/testApp.js -o build/testBuild.js -t lessify -v"
    },
    "window": {
        "title": "node-webkit demo",
        "icon": "timeslicer.png",
        "toolbar": false,
        "transparent": true,
        "frame": false,
        "width": 408,
        "height": 42,
        "position": "center",
        "min_width": 233,
        "min_height": 42
    }
}

},{}]},{},[5]);
