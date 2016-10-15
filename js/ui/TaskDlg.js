'use strict';
require('./taskDlg.less');
var Dome = require('./Dome');
var getText = require('./getText');
var util = require('./util');


function TaskDlg(task, cb) {
    this.task = task;
    this.cb = cb;
    this.parent = document.body;
    this.dialogRoot = Dome.newDiv(this.parent);

    var dialog = this.dialog = this.dialogRoot.newDiv('taskDlg dialog');
    dialog.newDiv('dialogTitle').setText(getText('editTaskTitle'));

    var content = dialog.newDiv('content');

    var btn = Dome.newButton(content, 'newTask', getText('newTask'), this._validate.bind(this, 'newTask'));
    btn.dlg = this;
    btn = Dome.newButton(content, 'delTask', getText('delTask'), this._validate.bind(this, 'delTask'));
    btn.dlg = this;

    this.oldName = task.name;
    this.oldTime = util.ms2str(task.timeWorked);
    this.name = Dome.newInput(content, 'name', getText('taskName') + ':', this.oldName);
    this.time = Dome.newInput(content, 'time', getText('taskTime') + ':', this.oldTime);

    var btnDiv = dialog.newDiv('btnDiv');
    btn = Dome.newButton(btnDiv, 'ok', 'OK', this._validate.bind(this, 'edit'));
    btn.dlg = this;

    this.dialogRoot.appendTo(this.parent);
}
module.exports = TaskDlg;


TaskDlg.prototype._validate = function (action) {
    Dome.removeChild(this.parent, this.dialogRoot);

    if (action === 'edit') {
        var newName = this.name.value();
        if (newName !== this.oldName) this.task.rename(newName);

        var newTime = this.time.value();
        if (newTime !== this.oldTime) {
            return this.cb(action, util.str2ms(newTime));
        }
    }

    this.cb(action);
};
