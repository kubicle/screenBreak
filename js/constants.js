'use strict';

var SECOND = 1000, MINUTE = 60000, HOUR = 3600000;


// UI refresh frequency; this is also the heartbeat of the app,
// i.e. nothing can happen more often than these 2 frequencies
exports.WORKING_REFRESH_FREQ = 10 * SECOND;
exports.RESTING_REFRESH_FREQ = 1 * SECOND;

// Save regularly; useful for crashes or unexpected system shutdown
exports.SAVE_FREQ = 3 * MINUTE;

// If you leave your computer while in "working" mode:
exports.AUTOPAUSE_AFTER_INACTION = 75 * MINUTE; // should not be < NONSTOP_PERIOD

// How long is it healthy to work without taking a break
exports.NONSTOP_PERIOD = 60 * MINUTE;
// How long should you rest if you work a full NONSTOP_PERIOD
exports.REST_FOR_NONSTOP_PERIOD = 5 * MINUTE;

// How long is a "night" break
// (triggers an automatic "Start new day" but you can also do it from UI menu)
exports.NEW_DAY_BREAK = 6 * HOUR;

exports.GOT_BREAK_MS = 5 * MINUTE;

exports.WORKING_ALERT_FREQ = 15 * MINUTE;
exports.RESTING_ALERT_FREQ = 1 * MINUTE;

exports.ANNOYING_ALERT_LEVEL = 100; // percentage of gauge
exports.ANNOYING_ALERT_REPEAT_DELAY = 10 * MINUTE; // you can make the annoying alert quite for that much before it comes back
