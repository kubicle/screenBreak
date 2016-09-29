'use strict';

require('./ui/style.less');
var pkg = require('../package.json');
var Ui = require('./ui/Ui');
var Workometer = require('./Workometer');
var localPref = require('./localPref');

var WORKING_REFRESH_FREQ = 60000;
var RESTING_REFRESH_FREQ = 1000;

var WORKING_ALERT_FREQ = 60000 * 15;
var RESTING_ALERT_FREQ = 60000;

var ANNOYING_ALERT_AFTER = 60; // minutes
var AUTOPAUSE_AFTER_INACTION = 75; // minutes


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
	this.ui = new Ui(this, this.userEventHandler.bind(this));
	this.ui.createUi();

	this.workometer = new Workometer(localPref.getValue('workometerState'));

	this.refreshMethod = this.refresh.bind(this);
	this.refreshInterval = null;

	window.addEventListener('beforeunload', this.terminate.bind(this));

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
	if (extraPause > 5000) {
		this.workometer.backFromSleep(extraPause);
		if (!this.isWorking) return this.toggle();
	}

	var gaugeLevel = this.workometer.getLevel();
	var text = this.workometer.getText();
	this.ui.refresh(gaugeLevel, text);

	this.checkAlert();
};

App.prototype.checkAlert = function () {
	var now = Date.now();
	if (this.isWorking) {
		if (now - this.lastAlertTime < WORKING_ALERT_FREQ) return;
		this.lastAlertTime = now;
		this.ui.showAlert(10);

		var minutesInactive = (now - this.lastUserActionTime) / 60000;
		if (minutesInactive > ANNOYING_ALERT_AFTER) {
			// Start annoying alert until ping
			this.ui.showAlert();
		}
		if (minutesInactive > AUTOPAUSE_AFTER_INACTION) {
			this.toggle();
		}
	} else {
		if (now - this.lastAlertTime < RESTING_ALERT_FREQ) return;
		this.lastAlertTime = now;
		this.ui.showAlert(20);
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
	//case 'toggle': return this.toggle();
	case 'pause': return this.goOnPause();
	case 'ping': return this.userPing();
	case 'reset': return this.reset();
	}
};

app.initialize();