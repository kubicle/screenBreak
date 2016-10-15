'use strict';

var getText = require('./getText');


exports.ms2str = function (ms) {
    var min = Math.round(ms / 60000);
    var hour = Math.floor(min / 60);

    if (hour) {
        min -= hour * 60;
        return hour + getText('hourShort') + ('0' + min).slice(-2);
    } else {
        return min + getText('minuteShort');
    }
};

exports.str2ms = function (str) {
    xxx //TODO
};
