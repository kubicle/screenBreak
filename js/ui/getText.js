'use strict';

var dict = require('./en_dict.json');

function getText(id) {
    return dict[id];
}

module.exports = getText;
