'use strict';

var NONSTOP_PERIOD = 60 * 60000;
var REST_FOR_NONSTOP_PERIOD = 5 * 60000;
var NEW_DAY_BREAK = 6 * 60 * 60000;


function Workometer(state) {
	this.time0 = 0;
	this.level = 0;
	this.worked = 0;
	this.fatigue = 0;
	this.todaysWork = 0;
	this.isResting = true;

	if (state) {
		this.time0 = state.lastWorkTime || 0;
		this.worked = state.worked;
		this.fatigue = state.fatigue;
		this.todaysWork = state.todaysWork || 0;
	}
}
module.exports = Workometer;


Workometer.prototype.reset = function () {
	this.level = 0;
	this.fatigue = 0;
};

Workometer.prototype.serializeState = function () {
	return {
		lastWorkTime: this.time0,
		worked: this.worked,
		fatigue: this.fatigue,
		todaysWork: this.todaysWork
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
		this.worked += period;
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

Workometer.prototype.getFatigue = function () {
	return this.fatigue;
};
