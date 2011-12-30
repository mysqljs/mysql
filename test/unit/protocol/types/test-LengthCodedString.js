var common             = require('../../../common');
var assert             = require('assert');
var test               = require('utest');
var LengthCodedString = require(common.dir.lib + '/protocol/types/LengthCodedString');

test('LengthCodedString', {
  'String "ab"': function() {
    var lengthCodedInteger = new LengthCodedString('ab');
    var buffer             = new Buffer(lengthCodedInteger.length);

    lengthCodedInteger.copy(buffer, 0);

    assert.deepEqual(buffer, new Buffer([0x02, 0x61, 0x62]));
  },

  'Utf-8 String "Öl"': function() {
    var lengthCodedInteger = new LengthCodedString('Öl');
    assert.equal(lengthCodedInteger.length, 4);
  },

  'offset': function() {
    var lengthCodedInteger = new LengthCodedString('ab');
    var buffer             = new Buffer([0, 0, 0, 0]);

    lengthCodedInteger.copy(buffer, 1);

    assert.deepEqual(buffer, new Buffer([0x00, 0x02, 0x61, 0x62]));
  },
});
