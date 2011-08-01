var path = require('path');

var root = path.join(__dirname, '../');
exports.dir = {
  root: root,
  lib: root + '/lib',
};

exports.fastOrSlow = require('fast-or-slow');
