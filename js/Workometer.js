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

// Called when we did not "stop" but timers could not fire (computer went on pause)
Workometer.prototype.backFromSleep = function (pause) {
	this._checkNewDay();
	this.time0 = this.lastWorkTime = Date.now();
	this.fatigue = Math.max(this.fatigue - pause, 0);
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
		this.fatigue = Math.max(this.fatigue - delta, 0);
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
