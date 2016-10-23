'use strict';

function Test() {
    this.debug = false;
    this.isCiTest = this.isCoverTest = false;

    this.tests = null;
    this.testUi = null;
}

module.exports = new Test();


Test.prototype.initTests = function (TestSeries, addAllTests) {
    this.tests = new TestSeries();
    addAllTests(this.tests);
};

Test.prototype.assert = function (cond, comment) {
    if (cond === true) return;

    throw new Error('assertion failed: ' + (comment || cond)); // put your breakpoint here
};
