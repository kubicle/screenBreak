'use strict';

var tst = require('../test');

var TestSeries = require('./TestSeries');

function addAllTests(testSeries) {
    testSeries.add(require('./TestWorkometer'));
}

tst.initTests(TestSeries, addAllTests);
tst.tests.run();
