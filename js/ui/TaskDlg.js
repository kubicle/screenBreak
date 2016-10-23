'use strict';
require('./taskDlg.less');
var Dome = require('./Dome');
var getText = require('./getText');
var PopupDlg = require('./PopupDlg');
var util = require('./util');


function TaskDlg(mode, ui, cb) {
    var isNewMode = mode === 'new';
    this.workometer = ui.app.workometer;
    this.task = this.workometer.getTask();
    this.cb = cb;
    this.oldName = isNewMode ? '' : this.task.getName();
    this.oldTime = util.ms2str(this.task.getTimeWorked());

    this.parent = document.body;
    this.dialogRoot = PopupDlg.newOverlay();

    var dialog = this.dialog = this.dialogRoot.newDiv('taskDlg dialog');
    dialog.newDiv('dialogTitle').setText(isNewMode ? getText('newTaskTitle') : getText('editTaskTitle'));

    var content = dialog.newDiv('content');

    this.name = Dome.newInput(content, 'name', getText('taskName') + ':', this.oldName);
    if (!isNewMode) this.time = Dome.newInput(content, 'time', getText('taskTime') + ':', this.oldTime);

    var btnDiv = dialog.newDiv('btnDiv');
    if (isNewMode) this._newButton(btnDiv, 'newTask', getText('newTask'));
    if (!isNewMode) this._newButton(btnDiv, 'delTask', getText('delTask'));
    if (!isNewMode) this._newButton(btnDiv, 'edit', getText('OK'));
    this._newButton(btnDiv, 'cancel', getText('cancelAction'));

    this.dialogRoot.appendTo(this.parent);
    this.dialog.appendTo(this.dialogRoot, /*isFloating=*/true);
    this.name.elt.focus();
}
module.exports = TaskDlg;


function btnHandler() {
    this.dlg._validate(this.action);
}

TaskDlg.prototype._newButton = function (parent, action, label) {
    var btn = Dome.newButton(parent, action, label, btnHandler);
    btn.action = action;
    btn.dlg = this;
};

TaskDlg.prototype._validate = function (action) {
    var newName = this.name.value();

    switch (action) {
    case 'edit':
        if (newName !== this.oldName) {
            this.workometer.renameTask(newName);
        }
        var newTime = this.time.value();
        if (newTime !== this.oldTime) {
            var newTimeMs = util.str2ms(newTime);
            if (!newTimeMs && newTimeMs !== 0) {
                return new PopupDlg(this.dialog, getText('invalidValue') + ': ' + newTime);
            }
            this.workometer.editTaskTime(newTimeMs);
        }
        break;
    case 'newTask':
        this.workometer.newTask(newName);
        break;
    case 'delTask':
        var question = getText('delTask') + ': ' + this.oldName + '?';
        var options = { buttons: [getText('cancelAction'), getText('OK')] };
        var self = this;
        return new PopupDlg(this.dialog, question, getText('confirmTitle'), options, function (options) {
            if (!options.choice) return; 
            self.workometer.deleteTask();
            self._close();
        });
    case 'cancel':
        break;
    }

    this._close();
};

TaskDlg.prototype._close = function () {
    this.dialog.setVisible(false);
    Dome.removeChild(this.parent, this.dialogRoot);
    this.cb();
};
