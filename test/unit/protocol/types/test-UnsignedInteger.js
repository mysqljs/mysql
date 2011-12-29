var common = require('../../../common');
var assert = require('assert');
var test   = require('utest');
var UnsignedInteger = require(common.dir.lib + '/protocol/types/UnsignedInteger');

test('UnsignedInteger', {
  '1 byte': function() {
    var uint   = new UnsignedInteger(223);
    var buffer = new Buffer(uint.length);

    uint.copy(buffer, 0);

    assert.deepEqual(buffer, new Buffer([223]));
  },

  '4 bytes': function() {
    var uint   = new UnsignedInteger(257, 4);
    var buffer = new Buffer(uint.length);

    uint.copy(buffer, 0);

    assert.deepEqual(buffer, new Buffer([1, 1, 0, 0]));
  },

  'offset': function() {
    var uint   = new UnsignedInteger(223);
    var buffer = new Buffer([0, 0]);

    uint.copy(buffer, 1);

    assert.deepEqual(buffer, new Buffer([0, 223]));
  },
});

