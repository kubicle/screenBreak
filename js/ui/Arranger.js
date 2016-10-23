'use strict';

var Dome = require('./Dome');

var MARGIN = 10; // px; margin from viewport's border


function Arranger(viewportHandler) {
    this.viewportHandler = viewportHandler;
    this.MARGIN = MARGIN;

    this.xMin = [];
    this.yMin = [];
    this.xMax = [];
    this.yMax = [];
}
module.exports = Arranger;


Arranger.prototype._tryToFit = function (r, trans) {
    var viewportWidth = this.viewportHandler.getWidth();
    var viewportHeight = this.viewportHandler.getHeight();

    var newX = Math.max(Math.min(r.left, viewportWidth - r.width - MARGIN), MARGIN);
    var newY = Math.max(Math.min(r.top, viewportHeight - r.height - MARGIN), MARGIN);

    trans[0] += newX - r.left;
    trans[1] += newY - r.top;
    r.left = newX;
    r.top = newY;
};

Arranger.prototype.addElement = function (elt) {
    elt.style.transform = null;
    var trans = [0, 0];
    var r = Dome.getRect(elt);
    this._tryToFit(r, trans);

    this.viewportHandler.addElement(r);

    this._tryToFit(r, trans);
    elt.style.transform = 'translate(' + trans[0] + 'px, ' + trans[1] + 'px)';

    this.xMin.push(r.left);
    this.yMin.push(r.top);
    this.xMax.push(r.left + r.width);
    this.yMax.push(r.top + r.height);
    elt._rect = r;
};

function remove(array, val) {
    var pos = array.indexOf(val);
    if (pos !== -1) array.splice(pos, 1);
}

Arranger.prototype.removeElement = function (elt) {
    var r = elt._rect;
    remove(this.xMin, r.left);
    remove(this.yMin, r.top);
    remove(this.xMax, r.left + r.width);
    remove(this.yMax, r.top + r.height);
    // var xOrig = Math.min.apply(null, this.xMin);
    // var yOrig = Math.min.apply(null, this.yMin);
    var xLimit = Math.max.apply(null, this.xMax);
    var yLimit = Math.max.apply(null, this.yMax);

    this.viewportHandler.reduce(xLimit, yLimit);
};
