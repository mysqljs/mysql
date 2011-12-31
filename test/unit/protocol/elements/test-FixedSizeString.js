var common          = require('../../../common');
var assert          = require('assert');
var test            = require('utest');
var FixedSizeString = require(common.dir.lib + '/protocol/elements/FixedSizeString');

test('FixedSizeString', {
  'creates a buffer of the right size': function() {
    var string = new FixedSizeString(10);

    assert.ok(Buffer.isBuffer(string.value));
    assert.equal(string.value.length, 10);
  },
});

