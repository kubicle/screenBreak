'use strict';

var CONST = require('./constants');
var pkg = require('../package.json');
var Ui = require('./ui/Ui');
var Workometer = require('./Workometer');
var nwUtil = require('./nwUtil');
var localPref = require('./localPref');


function App() {
	nwUtil.initialize();

	this.appName = pkg.name;
	this.appVersion = pkg.version;

	this.ui = this.workometer = null;
	this.isWorking = false;
	this.lastRefresh = Date.now();
	this.currentFreq = 0;
}


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
	this._save();
	localPref.terminate();
	nwUtil.terminate();
};

App.prototype._save = function () {
	localPref.setValue('workometerState', this.workometer.serialize());
};

App.prototype.refresh = function () {
	var now = Date.now();
	var timeSinceLastRefresh = now - this.lastRefresh;
	this.lastRefresh = now;

	var extraPause = timeSinceLastRefresh - this.currentFreq;
	if (extraPause > CONST.SAVE_FREQ) { // why SAVE_FREQ: Because short and long enough
		this.workometer.backFromSleep(extraPause);
		// We force pause mode so user has to explicitely tap
		// otherwise a false move (e.g. mouse) would start a full work period
		if (this.isWorking) this.toggle();
	}

	this.ui.refresh();

	this._checkAlert();
};

App.prototype._checkAlert = function () {
	var now = Date.now();
	var timeSinceLastAlert = now - this.lastAlertTime;

	if (this.isWorking) {
		if (timeSinceLastAlert > CONST.SAVE_FREQ) {
			this._save();
		}
		// Could be optional: this gives a chance to notice we forgot to switch task, etc.
		if (timeSinceLastAlert >= CONST.WORKING_ALERT_FREQ) {
			this.lastAlertTime = now;
			this.ui.showAlert(5);
		}
		var timeInactive = now - this.lastUserActionTime;
		// When user worked over the maximum of the gauge, we complain; he can "toggle" it off each time
		if (this.workometer.getLevel() >= CONST.ANNOYING_ALERT_LEVEL &&
				timeInactive > CONST.ANNOYING_ALERT_REPEAT_DELAY
		) {
			this.ui.showAlert();
		}
		// If we did not see any user action in a while, declare this a break
		if (timeInactive > CONST.AUTOPAUSE_AFTER_INACTION) {
			this.toggle(); // NB: annoying alert stays on while we "rest" (user is most likely gone anyway)
		}
	} else {
		if (timeSinceLastAlert >= CONST.RESTING_ALERT_FREQ) {
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
	this.currentFreq = this.isWorking
		? CONST.WORKING_REFRESH_FREQ
		: CONST.RESTING_REFRESH_FREQ;
	this.refreshInterval = window.setInterval(this.refreshMethod, this.currentFreq);
};

App.prototype._noteUserIsHere = function () {
	this.ui.stopAlert();
	this.lastUserActionTime = this.lastAlertTime = Date.now();
};

App.prototype.gotBreak = function () {
	this.workometer.gotBreak(CONST.GOT_BREAK_MS);
	this.refresh();
};

App.prototype.backToWork = function () {
	if (!this.isWorking) this.toggle();
};

App.prototype.goOnPause = function () {
	if (this.isWorking) this.toggle();
};

App.prototype.userEventHandler = function (eventName) {
	this._noteUserIsHere();

	switch (eventName) {
	case 'pause': return this.goOnPause();
	case 'backToWork': return this.backToWork();
	case 'gotBreak': return this.gotBreak();
	case 'exit': return this.terminate();
	}
};

var app = new App();
app.initialize();
