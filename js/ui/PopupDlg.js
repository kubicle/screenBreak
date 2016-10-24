'use strict';
require('./popupDlg.less');
var Dome = require('./Dome');
var getText = require('./getText');


function action() {
    // "this" is the button
    var dlg = this.dlg;
    if (dlg.options) dlg.options.choice = this.id;

    PopupDlg.detachWithOverlay(dlg.dialog);

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

    var dialog = this.dialog = Dome.newDiv(null, 'popupDlg dialog');
    dialog.newDiv('dialogTitle').setText(title || getText('problem'));

    var content = dialog.newDiv('content');
    Dome.newLabel(content, 'message', msg);

    var btns = (options && options.buttons) || [getText('OK')];
    var btnDiv = dialog.newDiv('btnDiv');
    for (var i = 0; i < btns.length; i++) {
        newButton(btnDiv, this, btns[i], i);
    }

    PopupDlg.attachWithOverlay(this.dialog, this.parent);
}
module.exports = PopupDlg;


function newOverlay(parent) {
    var overlay = Dome.newDiv(null, 'popupOverlay');

    if (parent) {
        parent = parent.elt || parent;
        overlay.setStyle('left', parent.offsetLeft + 'px');
        overlay.setStyle('top', parent.offsetTop + 'px');
        overlay.setStyle('height', parent.scrollHeight + 'px');
    }

    return overlay;
}

PopupDlg.attachWithOverlay = function (dome, parent) {
    var overlay = dome.overlay = newOverlay();
    overlay.parent = parent;
    overlay.appendTo(parent);
    dome.appendTo(overlay, /*isFloating=*/true);
    overlay.setStyle('opacity', 1);
};

PopupDlg.detachWithOverlay = function (dome) {
    dome.overlay.setStyle('opacity', 0);
    window.setTimeout(function () {
        dome.setVisible(false);
        Dome.removeChild(dome.overlay.parent, dome.overlay);
    }, 300);
};
