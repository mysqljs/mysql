var common          = require('../../../common');
var assert          = require('assert');
var test            = require('utest');
var UnsignedNumber = require(common.dir.lib + '/protocol/elements/UnsignedNumber');

test('UnsignedNumber', {
  '1 byte': function() {
    var uint   = new UnsignedNumber(223);
    var buffer = new Buffer(uint.length);

    uint.copy(buffer, 0);

    assert.deepEqual(buffer, new Buffer([223]));
  },

  '4 bytes': function() {
    var uint   = new UnsignedNumber(257, 4);
    var buffer = new Buffer(uint.length);

    uint.copy(buffer, 0);

    assert.deepEqual(buffer, new Buffer([1, 1, 0, 0]));
  },

  'offset': function() {
    var uint   = new UnsignedNumber(223);
    var buffer = new Buffer([0, 0]);

    uint.copy(buffer, 1);

    assert.deepEqual(buffer, new Buffer([0, 223]));
  },
});

