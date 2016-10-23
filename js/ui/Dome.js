'use strict';
/* eslint no-console: 0 */

var arranger = null;
var painter = null;
var curGroup = null;
var uniqueId = 1;


/**
 * @param {Painter} [aPainter]
 * @param {Arranger} [anArranger]
 */
Dome.init = function (aPainter, anArranger) {
    painter = aPainter;
    arranger = anArranger;
};

/**
 * @param {Dome|DOM} parent
 * @param {string} type - e.g. "div" or "button"
 * @param {className} className - class name for CSS; e.g. "mainDiv" or "logBox outputBox"
 * @param {string} name - "nameBox" or "#nameBox"; if starts with "#" element is added to current DomeGroup
 */
function Dome(parent, type, className, name) {
    this.type = type;
    var elt = this.elt = document.createElement(type);
    this.isFloating = false;

    if (name && name[0] === '#') {
        curGroup.add(name.substr(1), this);
        // Some class names are built from name so "#" could be in className too
        if (className[0] === '#') className = className.substr(1);
    }
    if (className) elt.className = className;
    if (painter) painter.paint(elt, className);
    if (parent) {
        (parent instanceof Dome ? parent.elt : parent).appendChild(elt);
    }
}
module.exports = Dome;


Dome.prototype.appendTo = function (parent, isFloating) {
    (parent instanceof Dome ? parent.elt : parent).appendChild(this.elt);

    this.isFloating = isFloating;
    if (arranger && isFloating) arranger.addElement(this.elt);
};

Dome.removeChild = function (parent, dome) {
    if (arranger && dome.isFloating) arranger.removeElement(dome.elt);
    if (parent instanceof Dome) parent = parent.elt;
    parent.removeChild(dome.elt);
};
Dome.prototype.removeChild = function (child) { Dome.removeChild(this, child); };


// Setters

Dome.prototype.setText = function (text) { this.elt.textContent = text; return this; };
Dome.prototype.setHtml = function (html) { this.elt.innerHTML = html; return this; };
Dome.prototype.setAttribute = function (name, val) { this.elt.setAttribute(name, val); return this; };
Dome.prototype.setStyle = function (prop, value) { this.elt.style[prop] = value; return this; };

Dome.prototype.setVisible = function (show) {
    if (show === this.isVisible()) return this;
    this.elt.style.display = show ? '' : 'none';
    this._isVisible = !!show;
    if (arranger && this.isFloating) {
        if (show) arranger.addElement(this.elt);
        else arranger.removeElement(this.elt);
    }
    return this;
};

Dome.prototype.isVisible = function () {
    return this._isVisible || this._isVisible === undefined; // default is visible
};

Dome.prototype.setEnabled = function (enable) {
    this.elt.disabled = !enable;
    this.toggleClass('disabled', !enable);
    return this;
};

// Getters

Dome.prototype.text = function () { return this.elt.textContent; };
Dome.prototype.html = function () { return this.elt.innerHTML; };
Dome.prototype.value = function () { return this.elt.value; };
Dome.prototype.isChecked = function () { return this.elt.checked; }; // for checkboxes
Dome.prototype.getDomElt = function () { return this.elt; };

Dome.prototype.clear = function () { this.elt.innerHTML = ''; };

Dome.prototype.on = function (eventName, fn) {
    var self = this;
    this.elt.addEventListener(eventName, function (ev) { fn.call(self, ev); });
};

Dome.prototype.toggleClass = function (className, enable) {
    var elt = this.elt;
    var classes = elt.className, spClasses = ' ' + classes + ' ';
    var spClassName = ' ' + className + ' ';
    var pos = spClasses.indexOf(spClassName);

    if (enable) {
        if (pos >= 0) return;
        if (painter) painter.toggle(elt, className, enable);
        elt.className = classes + ' ' + className;
    } else {
        if (pos < 0) return;
        elt.className = spClasses.replace(spClassName, ' ').trim();
        if (painter) painter.toggle(elt, className, enable);
    }
};

Dome.prototype.scrollToBottom = function () {
    this.elt.scrollTop = this.elt.scrollHeight;
};

Dome.newDiv = function (parent, className, name) {
    return new Dome(parent, 'div', className, name || className);
};
Dome.prototype.newDiv = function (className, name) {
    return new Dome(this, 'div', className, name || className);
};

Dome.newButton = function (parent, name, label, action) {
    var button = new Dome(parent, 'button', name + 'Button', name);
    if (label) button.elt.innerText = label;
    button.on('click', action);
    return button;
};

Dome.newGfxButton = function (parent, name, action) {
    var btn = Dome.newButton(parent, name, null, action);
    btn.newDiv(name + 'BtnIcon btnIcon');
    return btn;
};

Dome.tapBehavior = function (elt, action) {
    elt.on('click', function (ev) {
        ev.stopPropagation();
        action.call(this);
    });
};

Dome.newLink = function (parent, name, label, url) {
    var link = new Dome(parent, 'a', name + 'Link', name);
    link.setAttribute('href', url);
    link.setText(label);
    return link;
};

Dome.newLabel = function (parent, name, label) {
    return new Dome(parent, 'div', name, name).setText(label);
};

Dome.newBreak = function (parent) {
    return new Dome(parent, 'br');
};

Dome.newInput = function (parent, name, label, init) {
    var labelName = name + 'Label';
    Dome.newLabel(parent, labelName + ' inputLbl', label, labelName);
    var input = new Dome(parent, 'input', name + 'Input inputBox', name);
    if (init !== undefined) input.elt.value = init;
    return input;
};

/** var myCheckbox = Dome.newCheckbox(testDiv, 'debug', 'Debug', null, true);
 *  ...
 *  if (myCheckbox.isChecked()) ...
 */
Dome.newCheckbox = function (parent, name, label, value, init) {
    var div = new Dome(parent, 'div', name + 'Div chkBoxDiv');
    var input = new Dome(div, 'input', name + 'ChkBox chkBox', name);
    var inp = input.elt;
    inp.type = 'checkbox';
    inp.name = name;
    if (value !== undefined) inp.value = value;
    inp.id = name + 'ChkBox' + (value !== undefined ? value : uniqueId++);
    if (init) inp.checked = true;

    new Dome(div, 'label', name + 'ChkLabel chkLbl', name)
        .setText(label)
        .setAttribute('for', inp.id);
    return input;
};

/** var myOptions = Dome.newRadio(parent, 'stoneColor', ['white', 'black'], null, 'white');
 *  ...
 *  var result = Dome.getRadioValue(myOptions);
 */
Dome.newRadio = function (parent, name, labels, values, init) {
    if (!values) values = labels;
    var opts = [];
    for (var i = 0; i < labels.length; i++) {
        var input = opts[i] = new Dome(parent, 'input', name + 'RadioBtn radioBtn', name);
        var inp = input.elt;
        inp.type = 'radio';
        inp.name = name;
        inp.value = values[i];
        inp.id = name + 'Radio' + values[i];
        if (values[i] === init) inp.checked = true;

        new Dome(parent, 'label', name + 'RadioLabel radioLbl', name)
            .setText(labels[i])
            .setAttribute('for', inp.id);
    }
    return opts;
};

/** @param {array} opts - the array of options returned when you created the radio buttons with newRadio */
Dome.getRadioValue = function (opts) {
    for (var i = 0; i < opts.length; i++) {
        if (opts[i].elt.checked) return opts[i].elt.value;
    }
};

/** var mySelect = Dome.newDropdown(parent, 'stoneColor', ['white', 'black'], null, 'white')
 *  ...
 *  var result = mySelect.value()
 */
Dome.newDropdown = function (parent, name, labels, values, init) {
    if (!values) values = labels;
    var select = new Dome(parent, 'select', name + 'DropDwn dropDwn', name);
    select.values = values;
    var cur = 0;
    for (var i = 0; i < labels.length; i++) {
        var opt = new Dome(select, 'option').elt;
        opt.value = values[i];
        opt.textContent = labels[i];
        if (values[i] === init) cur = i;
    }
    select.elt.selectedIndex = cur;
    return select;
};

Dome.prototype.select = function (value) {
    var ndx = this.values.indexOf(value);
    if (ndx !== -1) this.elt.selectedIndex = ndx;
};

//---Rect helpers

function Rect(left, top, width, height) {
    this.left = left;
    this.top = top;
    this.width = width;
    this.height = height;
}

Dome.getRect = function (eltOrDome) {
    var r = (eltOrDome.elt || eltOrDome).getBoundingClientRect();
    return new Rect(r.left, r.top, r.width, r.height);
};

//---Group helpers

function DomeGroup() {
    this.ctrl = {};
}

Dome.newGroup = function () {
    curGroup = new DomeGroup();
    return curGroup;
};

DomeGroup.prototype.add = function (name, dome) { this.ctrl[name] = dome; };
DomeGroup.prototype.get = function (name) { return this.ctrl[name]; };

DomeGroup.prototype.setEnabled = function (names, enabled, except) {
    if (names === 'ALL') names = Object.keys(this.ctrl);
    for (var i = 0; i < names.length; i++) {
        if (except && except.indexOf(names[i]) !== -1) continue;
        var elt = this.ctrl[names[i]];
        if (!elt) { console.error('Invalid control name:', names[i]); continue; }
        elt.setEnabled(enabled);
    }
};

DomeGroup.prototype.setVisible = function (names, show, except) {
    if (names === 'ALL') names = Object.keys(this.ctrl);
    for (var i = 0; i < names.length; i++) {
        if (except && except.indexOf(names[i]) !== -1) continue;
        var elt = this.ctrl[names[i]];
        if (!elt) { console.error('Invalid control name:', names[i]); continue; }
        elt.setVisible(show);
    }
};

//---Misc

Dome.setPageTitle = function (title) {
    document.head.getElementsByTagName('title')[0].textContent = title;
};

// Return the selected text if any - null if there is none
Dome.getSelectedText = function () {
    var selection = window.getSelection();
    if (!selection.rangeCount) return null;
    var range = selection.getRangeAt(0);
    var text = range.startContainer.data;
    if (!text) return null;

    return text.substring(range.startOffset, range.endOffset);
};

Dome.downloadFile = function (content, filename) {
    var file = new Blob([content]);
    var a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = filename;
    a.click();
};

// e.g. var fi = Dome.newInput(parent, 'loadGame', label).setAttribute('type', 'file');
// if (fi.hasFile()) fi.uploadFile(function (content) {...});
Dome.prototype.hasFile = function () {
    var files = this.elt.files;
    return files && files.length > 0;
};

Dome.prototype.uploadFile = function (cb) {
    var files = this.elt.files;
    if (!files) return console.error('Invalid field type for uploadFile: ' + this.type);
    if (!files.length) return false;
    var fr = new FileReader();
    fr.readAsText(files[0]);
    fr.onloadend = function () {
        return cb(fr.result);
    };
    return true;
};
