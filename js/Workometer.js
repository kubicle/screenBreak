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
	this.lastUserAction = Date.now();
	this.time0 = state.lastWorkTime || Date.now();
	this.taskWork = state.taskWork || 0;
	this.fatigue = state.fatigue || 0;
	this.tasks = state.tasks || {};
	this.todaysWork = state.todaysWork || 0;
	this.todaysLongestWork = state.todaysLongestWork || 0;
	this.todaysTooLongCount = state.todaysTooLongCount || 0;

	if (state.curTaskName !== undefined) {
		this._loadCurTask(state.curTaskName);
	} else {
		this._createTask();
	}
}
module.exports = Workometer;


Workometer.prototype.gotBreak = function (minPause) {
	var correction = minPause * MINUTE;
	this._removeFatigue(correction);
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

Workometer.prototype.start = function () {
	if (!this.isResting) return;
	this._startTimePeriod();
	this.isResting = false;
};

Workometer.prototype.stop = function () {
	if (this.isResting) return;
	this._startTimePeriod();
	this.isResting = true;
};

// Called when we did not "stop" but timers could not fire (computer went on pause)
Workometer.prototype.backFromSleep = function (pauseMs) {
	if (this.isResting) {
		this._startTimePeriod();
	} else {
		this.time0 += pauseMs; // adjust so pause is not counted as work
		this._startTimePeriod();
		this._removeFatigue(pauseMs);
	}
};

Workometer.prototype._startTimePeriod = function () {
	this._countTime();
	this.lastUserAction = Date.now();
};

Workometer.prototype._countTime = function () {
	var now = Date.now();
	var delta = now - this.time0;
	this.time0 = now;

	// checkNewDay
	if (now - this.lastUserAction >= NEW_DAY_BREAK) {
		this.todaysWork = 0;
		this.todaysLongestWork = 0;
		this.todaysTooLongCount = 0;
		this.fatigue = 0;
		this.lastUserAction = Date.now(); // force reset; user action did not actually happen
		delta = 0; // OK to reset everything here and leave it at that
	}
	
	if (this.isResting) {
		this._removeFatigue(delta);
	} else {
		this._addFatigue(delta);

		this.taskWork += delta;
		this.todaysWork += delta;

		if (delta > this.todaysLongestWork) this.todaysLongestWork = delta;
		if (delta > HOUR) this.todaysTooLongCount++;
	}

	this.level = this.fatigue / REST_FOR_NONSTOP_PERIOD * 100;
};

Workometer.prototype._removeFatigue = function (pauseMs) {
	this.fatigue = Math.max(this.fatigue - pauseMs, 0);
};

Workometer.prototype._addFatigue = function (workMs) {
	this.fatigue += workMs / NONSTOP_PERIOD * REST_FOR_NONSTOP_PERIOD;
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

// Called regularly by UI
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
