'use strict';

var beforeunloadHandlers = [];


exports.listenBeforeunload = function (handler) {
    beforeunloadHandlers.push(handler);
};

function triggerHandlers() {
    for (var i = 0; i < beforeunloadHandlers.length; i++) {
        beforeunloadHandlers[i]();
    }
    return true;
}

if (typeof process !== 'undefined' && process.versions['node-webkit']) {
    var win = nw.Window.get();
    win.on('close', function () {
        triggerHandlers();
        this.close(true);
    });
} else {
    window.addEventListener('beforeunload', triggerHandlers);
}
