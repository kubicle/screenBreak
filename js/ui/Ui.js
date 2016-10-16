'use strict';

require('./mainUi.less');
var ContextMenu = require('./ContextMenu');
var Dome = require('./Dome');
var getText = require('./getText');
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
}
module.exports = Ui;


/** This is the entry point for starting the app */
Ui.prototype.createUi = function () {
    Dome.setPageTitle(this.app.appName);
    var mainDiv = Dome.newDiv(document.body, 'mainDiv');
    this._createGauge(mainDiv);
    this._createButtons(mainDiv);
};

Ui.prototype._addTapBehavior = function (div, eventName) {
    var handler = function (eventName) { this.eventHandler(eventName); }.bind(this, eventName);
    touchManager.listenOn(div.elt, handler);
};

Ui.prototype._createGauge = function (parent) {
    var gauge = this.gauge = parent.newDiv('gauge');
    this.green = gauge.newDiv('colorBand green');
    this.amber = gauge.newDiv('colorBand amber');
    this.red = gauge.newDiv('colorBand red');
    this.label = gauge.newDiv('label');

    touchManager.listenOn(gauge.elt, this._switchDisplay.bind(this));
};

Ui.prototype._newButton = function (parent, className, label, action) {
    var btn = parent.newDiv(className).setText(label);
    this._addTapBehavior(btn, action);
    return btn;
};

Ui.prototype._createButtons = function (parent) {
    this.pauseBtn = this._newButton(parent, 'pauseBtn', getText('pauseBtn'), 'pause');
    this.pingBtn = this._newButton(parent, 'pingBtn', getText('pingBtn'), 'ping');
    this.settingsBtn = Dome.newGfxButton(parent, 'settings', this._showSettingsMenu.bind(this));
};

Ui.prototype._showSettingsMenu = function () {
    var cm = this.contextMenu;
    if (!this.contextMenu) {
        cm = this.contextMenu = new ContextMenu();
        cm.addOption(getText('resetAction'), this.eventHandler.bind(this, 'reset'));
        cm.addOption(getText('newTaskAction'), this._showTaskDlg.bind(this, 'new'));
        cm.addOption(getText('editTaskAction'), this._showTaskDlg.bind(this, 'edit'));
        cm.attachMenu(this.settingsBtn);
        return;
    }
    if (cm.isVisible()) {
        cm.setVisible(false);
    } else {
        cm.setVisible(true);
    }
};

Ui.prototype.setWorking = function (isWorking) {
    this.pauseBtn.setVisible(isWorking);
    this.pingBtn.setVisible(!isWorking);
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
    var status = this.workStatus || {};
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
