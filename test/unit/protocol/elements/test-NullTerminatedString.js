var common               = require('../../../common');
var assert               = require('assert');
var test                 = require('utest');
var NullTerminatedString = require(common.dir.lib + '/protocol/elements/NullTerminatedString');

test('NullTerminatedString', {
  '1 byte': function() {
    var string = new NullTerminatedString('a');
    var buffer = new Buffer([255, 255]);

    string.copy(buffer, 0);

    // ASCII a = 97
    assert.deepEqual(buffer, new Buffer([97, 0x00]));
  },

  '2 byte': function() {
    var string = new NullTerminatedString('ab');
    var buffer = new Buffer([255, 255, 255]);

    string.copy(buffer, 0);

    assert.deepEqual(buffer, new Buffer([97, 98, 0x00]));
  },

  'empty string': function() {
    var string = new NullTerminatedString('');
    var buffer = new Buffer([255]);

    string.copy(buffer, 0);

    assert.deepEqual(buffer, new Buffer([0]));
  },


  'length': function() {
    var string = new NullTerminatedString('ab');

    // a (1) + b (1) + 0x00 (1) = 3
    assert.equal(string.length, 3);
  },

  'multibyte length': function() {
    var string = new NullTerminatedString('Öl');

    // Ö (2) + l (1) + 0x00 (1) = 4
    assert.equal(string.length, 4);
  },
});

