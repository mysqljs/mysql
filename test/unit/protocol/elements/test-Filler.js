var common = require('../../../common');
var assert = require('assert');
var test   = require('utest');
var Filler = require(common.dir.lib + '/protocol/elements/Filler');

test('Filler', {
  '1 byte': function() {
    var filler = new Filler(1);
    var buffer = new Buffer([255]);

    filler.copy(buffer, 0);

    assert.deepEqual(buffer, new Buffer([0]));
  },

  '10 bytes': function() {
    var filler = new Filler(10);
    var buffer = new Buffer([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

    filler.copy(buffer, 0);

    assert.deepEqual(buffer, new Buffer([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
  },

  'offset': function() {
    var filler = new Filler(1);
    var buffer = new Buffer([1, 2, 3]);

    filler.copy(buffer, 1);

    assert.deepEqual(buffer, new Buffer([1, 0, 3]));
  },

  'write 1 bytes': function() {
    var filler = new Filler(1);

    var full = filler.write(new Buffer([0x00]), 0, 1);
    assert.equal(full, true);
    assert.equal(filler.bytesWritten, 1);
  },

  'write 2 bytes': function() {
    var filler = new Filler(2);

    var full = filler.write(new Buffer([0x00, 0x00]), 0, 2);
    assert.equal(full, true);
    assert.equal(filler.bytesWritten, 2);
  },

  'write 2 bytes from bigger buffer': function() {
    var filler = new Filler(2);

    var full = filler.write(new Buffer([0x00, 0x00, 0x00]), 0, 3);
    assert.equal(full, true);
    assert.equal(filler.bytesWritten, 2);
  },

  'write 2 bytes individually': function() {
    var filler = new Filler(2);

    var full = filler.write(new Buffer([0x00, 0x00]), 0, 1);
    assert.equal(full, false);
    assert.equal(filler.bytesWritten, 1);

    var full = filler.write(new Buffer([0x00, 0x00]), 0, 1);
    assert.equal(full, true);
    assert.equal(filler.bytesWritten, 2);
  },
});

