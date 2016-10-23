'use strict';

var inherits = require('util').inherits;
var log = require('../log');
var TestCase = require('./TestCase');
var Workometer = require('../Workometer');

var MINUTE = 60000, HOUR = 3600000;

var lastWorkTime0 = 1000;
var pastFatigue = 50000;
var fakeT0 = 100000; // enough to clear fatigue of pastFatigue

var state0 = {
    curTaskName: 'task1', lastWorkTime: lastWorkTime0, taskWork: 444555, todaysWork: 9555555, fatigue: pastFatigue,
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


function fakeDateNow(time) {
    Date.now = function () { return time; };
}

TestWorkometer.prototype.testLoadState = function () {
    var w = new Workometer(state0);

    // private ones
    this.assertEqual(lastWorkTime0, w.time0);
    this.assertEqual(pastFatigue, w.fatigue);

    // read "status" - this updates time counting (like if app was "off" during the gap - so no more fatigue, etc.)
    var status = {};
    w.getStatus(status);

    this.assertEqual(0, status.fatigue);
    this.assertEqual(0, status.level);
    this.assertEqual(true, status.isResting);
    this.assertEqual('task1', status.taskName);
    this.assertEqual(444555, status.taskWork);
    this.assertEqual(9555555, status.todaysWork);

    this.assertEqual(0, w.getLevel()); // other way to get "level"
};

TestWorkometer.prototype.testSaveState = function () {
    var w = new Workometer(state0);

    var state = w.serialize();
    this.assertEqual(state0, state);
};

TestWorkometer.prototype.testStartStop = function () {
    var status = {};
    var w = new Workometer(state0);

    fakeDateNow(fakeT0);
    w.getStatus(status);

    this.assertEqual(true, status.isResting);
    this.assertEqual(444555, status.taskWork);
    this.assertEqual(9555555, status.todaysWork);
 
    w.start();
    w.getStatus(status);
    this.assertEqual(false, status.isResting);

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
    var w = new Workometer(state0);

    fakeDateNow(lastWorkTime0 + 20000);
    w.start();

    w.getStatus(status);

    this.assertEqual(10, status.level); // 50 sec - 20sec => 30 sec fatigue = 10% of gauge
};

TestWorkometer.prototype.testStartAppNextDay = function () {
    var status = {};
    var w = new Workometer(state0);

    // less than 6 hours
    fakeDateNow(lastWorkTime0 + 5.9 * HOUR);
    w.start();
    w.getStatus(status);
    this.assertEqual(9555555, status.todaysWork);

    // 6 hours while app is OFF
    w = new Workometer(state0);
    fakeDateNow(lastWorkTime0 + 6.1 * HOUR);
    w.start();
    w.getStatus(status);
    this.assertEqual(0, status.todaysWork);

    // 6 hours while resting
    w = new Workometer(state0);
    fakeDateNow(fakeT0);
    w.start();
    w.stop();
    w.getStatus(status);
    this.assertEqual(9555555, status.todaysWork);

    fakeDateNow(fakeT0 + 6.1 * HOUR);
    w.start();
    w.getStatus(status);
    this.assertEqual(0, status.todaysWork);
};

TestWorkometer.prototype.testComputerSleep = function () {
    var status = {};
    var w = new Workometer(state0);

    // computer sleep while working = pause
    fakeDateNow(lastWorkTime0);
    w.start();
    var pause = 10000;
    w.backFromSleep(pause);
    w.getStatus(status);
    this.assertEqual(9555555, status.todaysWork);
    this.assertEqual(pastFatigue - pause, status.fatigue);

    // sleep while resting
    w.stop();
    var pause2 = 6.1 * HOUR;
    fakeDateNow(lastWorkTime0 + pause2); // not used by Workometer here but just to be coherent
    w.backFromSleep(pause2);
    w.getStatus(status);
    this.assertEqual(0, status.todaysWork);
    this.assertEqual(0, status.fatigue);
};

//TODO: add tests for task switching, creating, etc.
