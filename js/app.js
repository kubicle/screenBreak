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
	this.appName = pkg.name;
	this.appVersion = pkg.version;

	this.ui = this.workometer = null;
	this.isWorking = false;
	this.lastRefresh = Date.now();
	this.currentFreq = 0;
}

var app = module.exports = new App();


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
	localPref.setValue('workometerState', this.workometer.serializeState());
	localPref.terminate();
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

App.prototype.reset = function () {
	this.workometer.reset();
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
	case 'reset': return this.reset();
	}
};

app.initialize();
