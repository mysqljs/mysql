var path   = require('path');
var assert = require('assert');
var common = require('../../common');
var lib    = require(path.resolve(common.lib, '../index'));
var types  = require(path.resolve(common.lib, 'protocol/constants/types'));

assert.equal(typeof lib.Types, 'object');

for (var k in types) {
  assert.equal(lib.Types[k], types[k]);
}
