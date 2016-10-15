'use strict';

require('./contextMenu.less');
var Dome = require('./Dome');
var getText = require('./getText');


function ContextMenu() {
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
    this.menu.setVisible(false);
};

ContextMenu.prototype.setVisible = function(shouldShow) {
    this.menu.setVisible(shouldShow);
};

ContextMenu.prototype.isVisible = function() {
    return this.menu.isVisible();
};
