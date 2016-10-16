'use strict';

var isNw = typeof process !== 'undefined' && !!process.versions['node-webkit'];
var beforeunloadHandlers = [];

var EXTRA = 50; // px
var MARGIN = 20; // px


exports.showElement = function (elt) {
    var viewportWidth = document.documentElement.clientWidth;
    var viewportHeight = document.documentElement.clientHeight;
    elt.style.transform = null;
    var r = elt.getBoundingClientRect();

    if (isNw) {
        if (r.width + EXTRA > viewportWidth || r.height + EXTRA > viewportHeight) {
            var newWidth = Math.max(viewportWidth, r.width) + EXTRA;
            var newHeight = Math.max(viewportHeight, r.height) + EXTRA;
            window.resizeTo(newWidth, newHeight);
            //alert('r.height:' + r.height + ' newHeight:' + newHeight + ' viewportHeight:' + viewportHeight)
            viewportWidth = newWidth;
            viewportHeight = newHeight;
        }
    }

    var dx = Math.min(r.left, viewportWidth - r.width - MARGIN) - r.left;
    var dy = Math.min(r.top, viewportHeight - r.height - MARGIN) - r.top;
    elt.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
};

exports.listenBeforeunload = function (handler) {
    beforeunloadHandlers.push(handler);
};

function triggerHandlers() {
    for (var i = 0; i < beforeunloadHandlers.length; i++) {
        beforeunloadHandlers[i]();
    }
    return true;
}

function initializeForNw() {
    nw.Screen.Init();
    //alert(JSON.stringify(nw.Screen.screens[0].work_area)) TODO: use work_area to get screen limits
    var win = nw.Window.get();
    win.on('close', function () {
        triggerHandlers();
        this.close(true);
    });
}

function initializeForBrowser() {
    window.addEventListener('beforeunload', triggerHandlers);
}

if (isNw) {
    initializeForNw();
} else {
    initializeForBrowser();
}
