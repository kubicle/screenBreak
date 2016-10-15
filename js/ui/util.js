'use strict';

var getText = require('./getText');

var MINUTE = 60000, HOUR = 3600000;


// e.g. ms2str(60000) => "1min"; ms2str(3600000) => "1h00"
exports.ms2str = function (ms) {
    var durationInMinutes = Math.round(ms / MINUTE);
    var hour = Math.floor(durationInMinutes / 60);

    if (hour) {
        var min = durationInMinutes - hour * 60;
        return hour + getText('hourShort') + ('0' + min).slice(-2);
    } else {
        return durationInMinutes + getText('minuteShort');
    }
};

// e.g. str2ms('1h00') => 3600000; str2ms('2min') => 120000
exports.str2ms = function (str) {
    var hhmm = str.split(getText('hourShort'));
    if (hhmm.length > 1) {
        return parseInt(hhmm[0]) * HOUR + (hhmm[1] ? parseInt(hhmm[1]) * MINUTE : 0);
    } else {
        return parseInt(hhmm[0]) * MINUTE;
    }
};
