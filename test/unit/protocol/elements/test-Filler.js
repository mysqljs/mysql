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
});

