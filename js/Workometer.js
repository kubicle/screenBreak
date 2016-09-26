'use strict';

var NONSTOP_PERIOD = 60 * 60000;
var REST_FOR_NONSTOP_PERIOD = 5 * 60000;


function Workometer(state) {
	this.level = 0;
	this.worked = 0;
	this.fatigue = 0;
	this.isResting = true;

	if (state) {
		this.worked = state.worked;
		this.fatigue = state.fatigue;
	}
}
module.exports = Workometer;


Workometer.prototype.reset = function () {
	this.level = 0;
	this.fatigue = 0;
};

Workometer.prototype.serializeState = function () {
	return {
		worked: this.worked,
		fatigue: this.fatigue
	};
};

Workometer.prototype.start = function () {
	this.time0 = Date.now();
	this.isResting = false;
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
		this.fatigue += period / NONSTOP_PERIOD * REST_FOR_NONSTOP_PERIOD;
	}
	this.level = this.fatigue / REST_FOR_NONSTOP_PERIOD * 100;
};

Workometer.prototype.backFromSleep = function (pause) {
	this.time0 = Date.now();
	this.fatigue = Math.max(this.fatigue - pause, 0);
};

Workometer.prototype.getLevel = function () {
	this._countTime();
	return this.level;
};

function ms2str(ms) {
	var min = Math.round(ms / 60000);
	var hour = Math.floor(min / 60);

	if (hour) {
		min -= hour * 60;
		return hour + 'h' + ('0' + min).slice(-2);
	} else {
		return min + 'min';
	}
}

Workometer.prototype.getText = function () {
	if (this.isResting) {
		return 'resting: ' + ms2str(this.fatigue);
	} else {
		return ms2str(this.worked) + ' fatigue: ' + ms2str(this.fatigue);
	}
};
