'use strict';

var Task = require('./Task');

var MINUTE = 60000, HOUR = 3600000;
var NONSTOP_PERIOD = 60 * MINUTE;
var REST_FOR_NONSTOP_PERIOD = 5 * MINUTE;
var NEW_DAY_BREAK = 6 * HOUR;


function Workometer(state) {
	this.level = 0;
	this.isResting = true;

	state = state || {};
	this.time0 = state.lastWorkTime || 0;
	this.taskWork = state.taskWork || 0;
	this.todaysWork = state.todaysWork || 0;
	this.fatigue = state.fatigue || 0;
	this.tasks = state.tasks || {};

	if (state.curTaskName !== undefined) {
		this._loadCurTask(state.curTaskName);
	} else {
		this._createTask();
	}

	if (state.lastWorkTime) this._checkNewDay();
}
module.exports = Workometer;


Workometer.prototype.reset = function () {
	this.level = 0;
	this.fatigue = 0;
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
	// NB: no need to adjust time counting since _countTime was not called during the pause
};

Workometer.prototype.stop = function () {
	if (this.isResting) return;
	this._countTime();
	this.time0 = Date.now();
	this.isResting = true;
};

Workometer.prototype._countTime = function () {
	var now = Date.now();
	var delta = now - this.time0;
	this.time0 = now;

	if (this.isResting) {
		this.fatigue = Math.max(this.fatigue - delta, 0);
	} else {
		this.taskWork += delta;
		this.todaysWork += delta;
		this.fatigue += delta / NONSTOP_PERIOD * REST_FOR_NONSTOP_PERIOD;
	}
	this.level = this.fatigue / REST_FOR_NONSTOP_PERIOD * 100;
};

Workometer.prototype._loadCurTask = function (name) {
	this.curTask = new Task(this.tasks[name]);
	this.taskWork = this.curTask.timeWorked;
};

Workometer.prototype._saveCurTask = function () {
	var oldName = this.curTask.getOldName();
	if (oldName) {
		delete this.tasks[oldName];
	}

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

Workometer.prototype.editTaskTime = function (time) {
	this.taskWork = time;
};

Workometer.prototype.getTaskName = function () {
	return this.curTask.name;
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
