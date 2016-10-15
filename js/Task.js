'use strict';


function Task(state) {
    state = state || {};
    this.timeWorked = state.timeWorked || 0;
    this.name = state.name || '';

    this.name0 = this.name;
}
module.exports = Task;


Task.prototype.serialize = function () {
    this.name0 = this.name;

    return {
        name: this.name,
        timeWorked: this.timeWorked
    };
};

Task.prototype.updateTime = function (time) {
    this.timeWorked = time;
};

Task.prototype.rename = function (name) {
    this.name = name;
};

Task.prototype.getOldName = function () {
    return this.name0 !== this.name ? this.name0 : null;
};
