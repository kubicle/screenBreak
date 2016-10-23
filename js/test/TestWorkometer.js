'use strict';

var inherits = require('util').inherits;
var log = require('../log');
var TestCase = require('./TestCase');
var Workometer = require('../Workometer');

var state0 = {
    curTaskName: 'task1', lastWorkTime: 1477205827288, taskWork: 444555, todaysWork: 9555555, fatigue: 22222,
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


TestWorkometer.prototype.testLoadState = function () {
    var w = new Workometer(state0);

    // private ones
    this.assertEqual(1477205827288, w.time0);
    this.assertEqual(22222, w.fatigue);

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

    log.warn(state0)
    log.warn(JSON.stringify(state))
    this.assertEqual(state0, state);
};
