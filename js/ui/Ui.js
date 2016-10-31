'use strict';

require('./mainUi.less');
var ContextMenu = require('./ContextMenu');
var Dome = require('./Dome');
var getText = require('./getText');
var nwUtil = require('../nwUtil');
var TaskDlg = require('./TaskDlg');
var touchManager = require('./TouchManager');
var util = require('./util');

var MAX_COLOR_BAND = 33;

var TODAY = 0, TASK = 1;
var DISPLAY_TYPES = [TODAY, TASK];


function Ui(app, eventHandler) {
    this.app = app;
    this.eventHandler = eventHandler;

    this.curDisplay = TODAY;

    this.alertInterval = null;
    this.alertOn = false;
    this.flashCount = 0;

    Dome.init(null, nwUtil.getArranger());
}
module.exports = Ui;


/** This is the entry point for starting the app */
Ui.prototype.createUi = function () {
    Dome.setPageTitle(this.app.appName);
    var mainDiv = Dome.newDiv(document.body, 'mainDiv');
    this._createGauge(mainDiv);
    this._createButtons(mainDiv);
};

Ui.prototype._createGauge = function (parent) {
    var gauge = this.gauge = parent.newDiv('gauge');
    this.green = gauge.newDiv('colorBand green');
    this.amber = gauge.newDiv('colorBand amber');
    this.red = gauge.newDiv('colorBand red');
    this.label = gauge.newDiv('label');

    touchManager.listenOn(gauge.elt, this._switchDisplay.bind(this));
};

Ui.prototype._createButtons = function (parent) {
    this.pauseBtn = Dome.newBtn(parent, 'pauseBtn', getText('pauseBtn'), this.eventHandler.bind(null, 'pause'));
    this.workBtn = Dome.newBtn(parent, 'workBtn', getText('workBtn'), this.eventHandler.bind(null, 'backToWork'));
    this.workBtn.setVisible(false);
    this.settingsBtn = Dome.newGfxBtn(parent, 'settingsBtn', this._showSettingsMenu.bind(this));
};

Ui.prototype._showSettingsMenu = function () {
    var cm = new ContextMenu();
    cm.addOption(getText('gotBreakAction'), this.eventHandler.bind(this, 'gotBreak'));
    cm.addOption(getText('taskAction'), this._showTaskMenu.bind(this));
    if (nwUtil.isNw()) cm.addOption(getText('exitAction'), this.eventHandler.bind(this, 'exit'));
    cm.attachMenu(this.settingsBtn);
};

function taskSwitchHandler() {
    // "this" is the menu option
    var self = this.ui;
    self.app.workometer.switchTask(this.taskName);
    self.refresh();
}

Ui.prototype._showTaskMenu = function () {
    var cm = new ContextMenu();
    cm.addOption(getText('newTaskAction'), this._showTaskDlg.bind(this, 'new'));
    cm.addOption(getText('editTaskAction'), this._showTaskDlg.bind(this, 'edit'));

    var workometer = this.app.workometer;
    for (var name in workometer.tasks) {
        var option = cm.addOption(name || getText('unnamedTask'), taskSwitchHandler);
        option.ui = this;
        option.taskName = name;
    }

    cm.attachMenu(this.settingsBtn);
};

Ui.prototype.setWorking = function (isWorking) {
    var btnToHide = isWorking ? this.workBtn : this.pauseBtn;
    var btnToShow = isWorking ? this.pauseBtn : this.workBtn;

    btnToHide.toggleClass('activated', true);

    window.setTimeout(function () {
        btnToHide.setVisible(false);
        btnToHide.toggleClass('activated', false);

        btnToShow.setVisible(true);
    }, 1000);
};

Ui.prototype.displayGauge = function (value, label) {
    var green = Math.min(value, MAX_COLOR_BAND);
    value -= green;
    var amber = Math.min(value, MAX_COLOR_BAND);
    value -= amber;
    var red = Math.min(value, MAX_COLOR_BAND);
    var isFull = red === MAX_COLOR_BAND;

    this.green.setStyle('width', green + '%');
    this.amber.setStyle('width', amber + '%');
    this.red.setStyle('width', isFull ? null : red + '%');

    this.gauge.toggleClass('full', isFull);

    this.label.setText(label);
};

Ui.prototype.refresh = function () {
    var status = this.workStatus = this.workStatus || {};
    this.app.workometer.getStatus(status);

    var text;
    if (status.isResting) {
        text = getText('resting') + ': ' + util.ms2str(status.fatigue);
    } else {
        switch (this.curDisplay) {
        case TODAY:
            text = getText('todaysWork') + ': ' + util.ms2str(status.todaysWork);
            break;
        case TASK:
            var taskName = status.taskName || getText('unnamedTask');
            text = taskName + ': ' + util.ms2str(status.taskWork);
            break;
        }
    }

    this.displayGauge(status.level, text);
};

Ui.prototype._switchDisplay = function () {
    this.curDisplay = (this.curDisplay + 1) % DISPLAY_TYPES.length;
    this.refresh();
};

Ui.prototype._flashAlert = function () {
    var alertOn = this.alertOn = !this.alertOn;
    this.gauge.toggleClass('alert', alertOn);
    if (alertOn) return;

    if (!this.flashCount) return; // infinite alert
    this.flashCount--;
    if (this.flashCount === 0) {
        window.clearInterval(this.alertInterval);
        this.alertInterval = null;
    }
};

Ui.prototype.showAlert = function (numFlash) {
    if (this.alertInterval && !this.flashCount) return; // already in infinite alert mode

    this.flashCount = numFlash;

    if (!this.alertInterval) {
        this.alertInterval = window.setInterval(this._flashAlert.bind(this), 70);
    }
};

Ui.prototype.stopAlert = function () {
    this.flashCount = 1;
};

Ui.prototype._showTaskDlg = function (mode) {
    new TaskDlg(mode, this, this.refresh.bind(this));
};
