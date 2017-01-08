'use strict';

var log = require('../log');
var tst = require('../test');


/** @class */
function TestCase(name) {
    this.name = name;
    this.series = null; // set by TestSeries (to avoid changing existing derived classes)
    this.isBroken = false;
}
module.exports = TestCase;


TestCase.prototype.startBrokenTest = function () {
    this.isBroken = true;
    this.series.startBrokenTest();
};

TestCase.prototype.check = function (result) {
    this.series.checkCount++;
    return result;
};

function _valueCompareHint(expected, val) {
    if (typeof expected !== 'string' || typeof val !== 'string') return '';
    // for short strings or strings that start differently, no need for this hint
    if (expected.length <= 15 || expected[0] !== val[0]) return '';

    for (var i = 0; i < expected.length; i++) {
        if (expected[i] !== val[i]) {
            return '(first discrepancy at position ' + i + ': "' +
                expected.substr(i, 10) + '..." / "' + val.substr(i, 10) + '...")';
        }
    }
    return '';
}

TestCase.prototype._compareObject = function (expected, value) {
    for (var m in value) {
        if (!(m in expected)) return 'Extra key "' + m + '" in value';
        var res = this.compareValue(expected[m], value[m]);
        if (res) return 'Bad value for key "' + m + '"\nexpected: ' + expected[m] + '\nvalue:    ' + value[m]; 
    }
    for (m in expected) {
        if (!(m in value)) return 'Missing key "' + m + '" in value';
    }
    return ''; // equal
};

TestCase.prototype.compareValue = function (expected, val) {
    if (expected instanceof Array) {
        if (!val instanceof Array) return 'Expected Array but got ' + val;
        for (var i = 0; i < expected.length; i++) {
            var msg = this.compareValue(expected[i], val[i]);
            if (msg) return 'Array item #' + i + ': ' + msg;
        }
        if (val.length !== expected.length) {
            return 'Expected Array of size ' + expected.length + ' but got size ' + val.length;
        }
        return ''; // equal
    }
    if (typeof expected === 'object' && typeof val === 'object') {
        return this._compareObject(expected, val);
    }
    if (val === expected) return '';
    return 'Expected:\n' + expected + '\nbut got:\n' + val + '\n' + _valueCompareHint(expected, val) + '\n';
};

TestCase.prototype.assertEqual = function (expected, val, comment) {
    this.series.checkCount++;
    var msg = this.compareValue(expected, val);
    if (msg === '') return;
    this.series.failTest(msg, comment);
};

TestCase.prototype.assertInDelta = function (expected, delta, val, comment) {
    this.series.checkCount++;
    if (Math.abs(val - expected) <= delta) return;
    this.series.failTest(val + ' is not in +/-' + delta + ' delta around ' + expected, comment);
};

TestCase.prototype.fail = function (comment) {
    this.series.failTest(comment);
};

TestCase.prototype.todo = function (comment) {
    this.series.todoCount++;
    log.info('TODO: ' + comment);
};

TestCase.prototype.showInUi = function (msg) {
    if (!tst.testUi) return;
    if (this.isBroken && !tst.debug) return;
    try {
        tst.testUi.showTestGame(this.name, msg);
    } catch (e) {
        log.error('Exception loading failed test in UI: ' + e.message);
    }
};
