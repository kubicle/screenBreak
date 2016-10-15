'use strict';

var MINUTE = 60000, HOUR = 3600000;
var NONSTOP_PERIOD = 60 * MINUTE;
var REST_FOR_NONSTOP_PERIOD = 5 * MINUTE;
var NEW_DAY_BREAK = 6 * HOUR;


function Workometer(state) {
	state = state || {};
	this.time0 = state.lastWorkTime || 0;
	this.taskWork = state.taskWork || 0;
	this.todaysWork = state.todaysWork || 0;
	this.fatigue = state.fatigue || 0;
	this.tasks = state.tasks || {};

	this.level = 0;
	this.isResting = true;

	if (state.lastWorkTime) this._checkNewDay();
}
module.exports = Workometer;


Workometer.prototype.reset = function () {
	this.level = 0;
	this.fatigue = 0;
};

Workometer.prototype.serializeState = function () {
	return {
		lastWorkTime: this.time0,
		taskWork: this.taskWork,
		todaysWork: this.todaysWork,
		fatigue: this.fatigue,
		tasks: this.tasks
	};
};

Workometer.prototype._checkNewDay = function () {
	if (Date.now() - this.time0 > NEW_DAY_BREAK) {
		this.todaysWork = 0;
	}
};

Workometer.prototype.start = function () {
	this._checkNewDay();
	this.time0 = Date.now();
	this.isResting = false;
};

// Called when we did not "stop" but timers could not fire (computer went on pause)
Workometer.prototype.backFromSleep = function (pause) {
	this._checkNewDay();
	this.time0 = Date.now();
	this.fatigue = Math.max(this.fatigue - pause, 0);
};

Workometer.prototype.stop = function () {
	if (this.isResting) return;
	this._countTime();
	this.time0 = Date.now();
	this.isResting = true;
};

Workometer.prototype._countTime = function () {
	var now = Date.now();
	var period = now - this.time0;
	this.time0 = now;

	if (this.isResting) {
		this.fatigue = Math.max(this.fatigue - period, 0);
	} else {
		this.taskWork += period;
		this.todaysWork += period;
		this.fatigue += period / NONSTOP_PERIOD * REST_FOR_NONSTOP_PERIOD;
	}
	this.level = this.fatigue / REST_FOR_NONSTOP_PERIOD * 100;
};

Workometer.prototype.updateCounting = function () {
	this._countTime();
};

Workometer.prototype.getLevel = function () {
	return this.level;
};

Workometer.prototype.getTodaysWork = function () {
	return this.todaysWork;
};

Workometer.prototype.getTaskWork = function () {
	return this.taskWork;
};

Workometer.prototype.getFatigue = function () {
	return this.fatigue;
};
