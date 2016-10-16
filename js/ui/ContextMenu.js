'use strict';

require('./contextMenu.less');
var Dome = require('./Dome');
var getText = require('./getText');


function ContextMenu(params) {
    this.isPersistent = !!params && params.isPersistent;

    this.options = [];
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

ContextMenu.prototype.attachMenu = function(parent) {
    this.addOption(getText('cancelAction'), null);
    this.menu.appendTo(parent);
    this.menu.elt.blur();
    this.parent = parent;
};

ContextMenu.prototype.detachMenu = function() {
    Dome.removeChild(this.parent, this.menu);
    this.parent = null;
};

ContextMenu.prototype._close = function () {
    if (this.isPersistent) {
        this.menu.setVisible(false);
    } else {
        this.detachMenu();
    }
};

ContextMenu.prototype.setVisible = function(shouldShow) {
    this.menu.setVisible(shouldShow);
};

ContextMenu.prototype.isVisible = function() {
    return this.menu.isVisible();
};
