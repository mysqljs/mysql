var assert     = require('assert');
var common     = require('../../common');
var Connection = require(common.lib + '/Connection')

var query  = Connection.createQuery('SELECT 1')
var stream = query.stream()

assert.doesNotThrow(function () {
  // put the stream into flowing mode
  stream.on('data', function () { })
});
