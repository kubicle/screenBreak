'use strict';

var inherits = require('util').inherits;
var TestCase = require('./TestCase');
var Workometer = require('../Workometer');

var MINUTE = 60000, HOUR = 3600000;

var lastWorkTime0 = 1000;
var pastFatigue = 50000;
var fakeT0 = 100000; // enough to clear fatigue of pastFatigue

var state0 = {
    curTaskName: 'task1',
    lastWorkTime: lastWorkTime0,
    taskWork: 444555,
    todaysWork: 9555555,
    fatigue: pastFatigue,
    tasks: {
        '': { name: '', timeWorked: 333444 },
        task1: {name: 'task1', timeWorked: 444555 }
    }
};


function TestWorkometer(testName) {
    TestCase.call(this, testName);
}
inherits(TestWorkometer, TestCase);
module.exports = TestWorkometer;


var originalDateNow = Date.now;

function fakeDateNow(time) {
    Date.now = function () { return time; };
}

TestWorkometer.cleanup = function () {
    Date.now = originalDateNow;
};

function newWorkometer() {
    return new Workometer(JSON.parse(JSON.stringify(state0)));
}

TestWorkometer.prototype.testLoadState = function () {
    var status = {};

    fakeDateNow(lastWorkTime0 - 10 * HOUR); // sets lastUserAction time
    var w = newWorkometer();

    // private ones
    this.assertEqual(lastWorkTime0, w.time0);
    this.assertEqual(pastFatigue, w.fatigue);

    // read "status" - updates time counting like if app was "off" during the gap - so no more fatigue, todaysWork, etc.
    fakeDateNow(lastWorkTime0 + 7 * HOUR);
    w.getStatus(status);

    this.assertEqual(0, status.fatigue);
    this.assertEqual(0, status.level);
    this.assertEqual(true, status.isResting);
    this.assertEqual('task1', status.taskName);
    this.assertEqual(444555, status.taskWork);
    this.assertEqual(0, status.todaysWork);

    this.assertEqual(0, w.getLevel()); // other way to get "level"
};

TestWorkometer.prototype.testSaveState = function () {
    var status = {};
    var w = newWorkometer();
    var state = w.serialize();
    this.assertEqual(state0, state);

    fakeDateNow(fakeT0);
    w.start(); // start or stop update lastWorkTime
    state = w.serialize();
    this.assertEqual(fakeT0, state.lastWorkTime);

    var stopWorkTime = fakeT0 + 10 * MINUTE;
    fakeDateNow(stopWorkTime);
    w.getStatus(status);

    state = w.serialize();
    this.assertEqual(stopWorkTime, state.lastWorkTime);
    w.stop();
    state = w.serialize();
    this.assertEqual(stopWorkTime, state.lastWorkTime);

    var Tlater = stopWorkTime + 3 * HOUR;
    fakeDateNow(Tlater);
    w.getStatus(status);
    state = w.serialize();
    this.assertEqual(Tlater, state.lastWorkTime);
};

TestWorkometer.prototype.testStartStop = function () {
    var status = {};
    fakeDateNow(lastWorkTime0);
    var w = newWorkometer();

    fakeDateNow(fakeT0);
    w.getStatus(status);

    this.assertEqual(true, status.isResting);
    this.assertEqual(444555, status.taskWork);
    this.assertEqual(9555555, status.todaysWork);
 
    w.start();
    w.getStatus(status);
    this.assertEqual(false, status.isResting);

    fakeDateNow(fakeT0 + 10 * MINUTE);
    w.getStatus(status);
    this.assertInDelta(100/6, 0.01, status.level);
    fakeDateNow(fakeT0 + 20 * MINUTE);
    w.getStatus(status);
    this.assertInDelta(100/3, 0.01, status.level);

    var delta = 30 * MINUTE; // so fatigue should be 50%
    fakeDateNow(fakeT0 + delta);

    w.stop();
    w.getStatus(status);
    this.assertEqual(true, status.isResting);
    this.assertEqual(444555 + delta, status.taskWork);
    this.assertEqual(9555555 + delta, status.todaysWork);
    this.assertEqual(50, status.level);

    var delta2 = 1.25 * MINUTE; // 50% fatigue means 2.5 minutes to rest, so 1.25 is half of it
    fakeDateNow(fakeT0 + delta + delta2);
    w.getStatus(status);
    this.assertEqual(true, status.isResting);
    this.assertEqual(444555 + delta, status.taskWork); // no change since we are resting
    this.assertEqual(9555555 + delta, status.todaysWork); // no change
    this.assertEqual(25, status.level);
};

// When app was stopped (or computer off) for not enough time to clear up passed fatigue
TestWorkometer.prototype.testStartAppWithFatigue = function () {
    var status = {};
    fakeDateNow(lastWorkTime0);
    var w = newWorkometer();

    fakeDateNow(lastWorkTime0 + 20000);
    w.start();

    w.getStatus(status);

    this.assertEqual(10, status.level); // 50 sec - 20sec => 30 sec fatigue = 10% of gauge
};

TestWorkometer.prototype.testStartAppNextDay = function () {
    var status = {};

    // less than 6 hours
    fakeDateNow(lastWorkTime0);
    var w = newWorkometer();
    fakeDateNow(lastWorkTime0 + 5.9 * HOUR);
    w.start();
    w.getStatus(status);
    this.assertEqual(9555555, status.todaysWork);

    // 6 hours while app is OFF
    fakeDateNow(lastWorkTime0);
    w = newWorkometer();
    fakeDateNow(lastWorkTime0 + 6.1 * HOUR);
    w.start();
    w.getStatus(status);
    this.assertEqual(0, status.todaysWork);

    // 6 hours while resting
    fakeDateNow(lastWorkTime0);
    w = newWorkometer();
    fakeDateNow(fakeT0);
    w.start();
    w.stop();
    w.getStatus(status);
    this.assertEqual(9555555, status.todaysWork);
    fakeDateNow(fakeT0 + 6.1 * HOUR);
    w.start();
    w.getStatus(status);
    this.assertEqual(0, status.todaysWork);

    // 6 hours while resting - more than 1 refresh
    fakeDateNow(lastWorkTime0);
    w = newWorkometer();
    fakeDateNow(fakeT0);
    w.start();
    w.stop();
    w.getStatus(status);
    this.assertEqual(9555555, status.todaysWork);
    fakeDateNow(fakeT0 + 5 * HOUR);
    w.getStatus(status);
    this.assertEqual(9555555, status.todaysWork);
    fakeDateNow(fakeT0 + 6.1 * HOUR);
    w.getStatus(status);
    this.assertEqual(0, status.todaysWork);
};

function addFatigue(ms) {
    return ms / 12; // Workometer does it differently but this ends up like this
}

TestWorkometer.prototype.testComputerSleep = function () {
    var status = {};
    fakeDateNow(lastWorkTime0);
    var w = newWorkometer();

    // computer sleep while working = pause
    fakeDateNow(lastWorkTime0);
    w.start();
    var work = 9000, pause = 3000;
    fakeDateNow(lastWorkTime0 + work);
    w.backFromSleep(pause);
    w.getStatus(status);
    this.assertEqual(9555555 + work - pause, status.todaysWork);
    this.assertEqual(pastFatigue + addFatigue(work - pause) - pause, status.fatigue);

    // sleep while resting
    w.stop();
    var pause2 = 6.1 * HOUR;
    fakeDateNow(lastWorkTime0 + pause2); // not used by Workometer here but just to be coherent
    w.backFromSleep(pause2);
    w.getStatus(status);
    this.assertEqual(0, status.todaysWork);
    this.assertEqual(0, status.fatigue);

    // work a long time... without human action
    fakeDateNow(lastWorkTime0);
    w = newWorkometer();
    var todaysWorkBefore = w.todaysWork;
    w.start();
    // first work 3 hours
    var workMs = 3 * HOUR;
    fakeDateNow(lastWorkTime0 + workMs);
    w.getStatus(status);
    this.assertEqual(todaysWorkBefore + workMs, status.todaysWork);
    this.assertEqual(pastFatigue + addFatigue(workMs), status.fatigue);
    this.assertEqual(444555 + workMs, status.taskWork);
    // Now a gap of 7 hours (anything over 6 hours)
    fakeDateNow(lastWorkTime0 + 7 * HOUR);
    w.getStatus(status);
    this.assertEqual(0, status.todaysWork);
    this.assertEqual(0, status.fatigue);
    this.assertEqual(444555 + workMs, status.taskWork); // work did not change!

    // computer long sleep while working = no work but next day
    fakeDateNow(lastWorkTime0);
    w = newWorkometer();
    fakeDateNow(lastWorkTime0);
    w.start();
    fakeDateNow(lastWorkTime0 + 8 * HOUR);
    w.backFromSleep(7 * HOUR);
    w.getStatus(status);
    this.assertEqual(0, status.todaysWork);
    this.assertEqual(0, status.fatigue);
    this.assertEqual(444555, status.taskWork);
    // same as above but user "stops" before timer
    fakeDateNow(lastWorkTime0);
    w = newWorkometer();
    fakeDateNow(lastWorkTime0);
    w.start();
    fakeDateNow(lastWorkTime0 + 8 * HOUR);
    w.stop();
    w.getStatus(status);
    this.assertEqual(0, status.todaysWork);
    this.assertEqual(0, status.fatigue);
    this.assertEqual(444555, status.taskWork);
};

//TODO: add tests for task switching, creating, etc.
