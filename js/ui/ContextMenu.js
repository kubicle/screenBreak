'use strict';

require('./contextMenu.less');
var Dome = require('./Dome');
var getText = require('./getText');
var PopupDlg = require('./PopupDlg');


function ContextMenu() {
    this.options = [];

    this.parent = document.body;
    this.menuRoot = PopupDlg.newOverlay();
    this.menu = Dome.newDiv(this.menuRoot, 'contextMenu');
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

    this.menuRoot.appendTo(this.parent);
    this.menu.appendTo(this.menuRoot, /*isFloating=*/true);
    this.menuRoot.elt.blur();
};

ContextMenu.prototype.detachMenu = function() {
    this.menu.setVisible(false);
    Dome.removeChild(this.parent, this.menuRoot);
};

ContextMenu.prototype._close = function () {
    this.detachMenu();
};

ContextMenu.prototype.setVisible = function(shouldShow) {
    this.menuRoot.setVisible(shouldShow);
};

ContextMenu.prototype.isVisible = function() {
    return this.menuRoot.isVisible();
};
