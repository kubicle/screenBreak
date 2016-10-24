'use strict';

require('./contextMenu.less');
var Dome = require('./Dome');
var getText = require('./getText');
var PopupDlg = require('./PopupDlg');


function ContextMenu() {
    this.options = [];

    this.parent = document.body;
    this.menu = Dome.newDiv(null, 'contextMenu');
}
module.exports = ContextMenu;


function tapHandler() {
    this.contextMenu._close();
    if (this.action) this.action.call(this);
}

ContextMenu.prototype.addOption = function(label, action) {
    var option = Dome.newDiv(this.menu, 'menuOption').setText(label);
    option.action = action;
    option.contextMenu = this;
    Dome.tapBehavior(option, tapHandler);
    this.options.push(option);
    return option;
};

// NB: we don't actually attach to target but use it to position the menu
ContextMenu.prototype.attachMenu = function(target) {
    this.addOption(getText('cancelAction'), null);

    var r = Dome.getRect(target);
    this.menu.setStyle('left', r.left + r.width / 2 + 'px');
    this.menu.setStyle('top', r.top + r.height / 2 + 'px');

    PopupDlg.attachWithOverlay(this.menu, this.parent);
};

ContextMenu.prototype.detachMenu = function() {
    PopupDlg.detachWithOverlay(this.menu);
};

ContextMenu.prototype._close = function () {
    this.detachMenu();
};
