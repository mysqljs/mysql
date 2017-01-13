var assert = require('assert');
var common = require('../../common');

var query  = common.createQuery('SELECT 1');
var stream = query.stream();

assert.doesNotThrow(function () {
  // put the stream into flowing mode
  stream.on('data', function () { });
});
