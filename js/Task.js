'use strict';


function Task(state) {
    state = state || {};
    this.name = state.name || '';
    this.timeWorked = state.timeWorked || 0;
}
module.exports = Task;


Task.prototype.serialize = function () {
    return {
        name: this.name,
        timeWorked: this.timeWorked
    };
};

Task.prototype.getName = function () {
    return this.name;
};

Task.prototype.getTimeWorked = function () {
    return this.timeWorked;
};

Task.prototype.updateTime = function (time) {
    this.timeWorked = time;
};

Task.prototype.rename = function (name) {
    this.name = name;
};
