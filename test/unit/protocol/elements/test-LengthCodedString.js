var common            = require('../../../common');
var assert            = require('assert');
var test              = require('utest');
var LengthCodedString = require(common.dir.lib + '/protocol/elements/LengthCodedString');

test('LengthCodedString', {
  'copy: utf8 string with offset': function() {
    var string = new LengthCodedString('utf8', 'Öl');
    var buffer = new Buffer([255, 255, 255, 255, 255, 255]);

    string.copy(buffer, 1);

    assert.deepEqual(buffer, new Buffer([255, 0x03, 0xc3, 0x96, 0x6c, 255]));
  },

  'copy: buffer with offset': function() {
    var string = new LengthCodedString(null, new Buffer('Öl', 'utf-8'));
    var buffer = new Buffer([255, 255, 255, 255, 255, 255]);

    string.copy(buffer, 1);

    assert.deepEqual(buffer, new Buffer([255, 0x03, 0xc3, 0x96, 0x6c, 255]));
  },
});
