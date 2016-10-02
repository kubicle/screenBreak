'use strict';

require('./mainUi.less');
var ContextMenu = require('./ContextMenu');
var Dome = require('./Dome');
var touchManager = require('./TouchManager');

var MAX_COLOR_BAND = 33;


function Ui(app, eventHandler) {
    this.app = app;
    this.eventHandler = eventHandler;

    this.alertInterval = null;
    this.alertOn = false;
    this.flashCount = 0;
}
module.exports = Ui;


/** This is the entry point for starting the app */
Ui.prototype.createUi = function () {
    var title = this.app.appName;
    Dome.setPageTitle(title);
    var mainDiv = Dome.newDiv(document.body, 'mainDiv');
    //mainDiv.newDiv('pageTitle').setText(title);
    this._createGauge(mainDiv);
    this._createButtons(mainDiv);
};

Ui.prototype._addTapBehavior = function (div, eventName) {
    var handler = function (eventName) { this.eventHandler(eventName); }.bind(this, eventName);
    touchManager.listenOn(div.elt, handler);
};

Ui.prototype._createGauge = function (parent) {
    var gauge = this.gauge = parent.newDiv('gauge');
    this._addTapBehavior(gauge, 'toggle');
    this.green = gauge.newDiv('colorBand green');
    this.amber = gauge.newDiv('colorBand amber');
    this.red = gauge.newDiv('colorBand red');
    this.label = gauge.newDiv('label');
};

Ui.prototype._newButton = function (parent, className, label, action) {
    var btn = parent.newDiv(className).setText(label);
    this._addTapBehavior(btn, action);
    return btn;
};

Ui.prototype._createButtons = function (parent) {
    this.pauseBtn = this._newButton(parent, 'pauseBtn', 'Bye!', 'pause');
    this.pingBtn = this._newButton(parent, 'pingBtn', 'I am here', 'ping');
    this.settingsBtn = Dome.newGfxButton(parent, 'settings', this._showSettingsMenu.bind(this));
};

Ui.prototype._showSettingsMenu = function () {
    var cm = this.contextMenu;
    if (!this.contextMenu) {
        cm = this.contextMenu = new ContextMenu();
        cm.addOption('Got a break', this.eventHandler.bind(this, 'reset'));
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

Ui.prototype.refresh = function (gaugeLevel, label) {
    this.displayGauge(gaugeLevel, label);
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
