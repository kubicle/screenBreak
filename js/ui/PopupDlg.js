'use strict';
require('./popupDlg.less');
var Dome = require('./Dome');
var getText = require('./getText');


function action() {
    // "this" is the button
    var dlg = this.dlg;
    if (dlg.options) dlg.options.choice = this.id;
    Dome.removeChild(dlg.parent, dlg.dialogRoot);
    if (dlg.validateFn) dlg.validateFn(dlg.options);
}

function newButton(div, dlg, label, id) {
    var btn = Dome.newButton(div, 'popupDlg', label, action);
    btn.dlg = dlg;
    btn.id = id;
}

function PopupDlg(parent, msg, title, options, validateFn) {
    this.parent = parent || document.body;
    this.options = options;
    this.validateFn = validateFn;

    this.dialogRoot = PopupDlg.newOverlay();

    var dialog = this.dialogRoot.newDiv('popupDlg dialog');
    dialog.newDiv('dialogTitle').setText(title || getText('problem'));

    var content = dialog.newDiv('content');
    Dome.newLabel(content, 'message', msg);

    var btns = (options && options.buttons) || [getText('OK')];
    var btnDiv = dialog.newDiv('btnDiv');
    for (var i = 0; i < btns.length; i++) {
        newButton(btnDiv, this, btns[i], i);
    }

    this.dialogRoot.appendTo(this.parent);
}
module.exports = PopupDlg;


PopupDlg.newOverlay = function (parent) {
    var overlay = Dome.newDiv(null, 'popupOverlay');

    if (parent) {
        parent = parent.elt || parent;
        overlay.setStyle('left', parent.offsetLeft + 'px');
        overlay.setStyle('top', parent.offsetTop + 'px');
        overlay.setStyle('height', parent.scrollHeight + 'px');
    }

    return overlay;
};
