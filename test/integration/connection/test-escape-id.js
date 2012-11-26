var SqlString = require('../../../lib/protocol/SqlString');
var assert    = require('assert');

assert.equal('`id`', SqlString.escapeId('id'));
assert.equal('`i``d`', SqlString.escapeId('i`d'));
assert.equal('`id1`.`id2`', SqlString.escapeId('id1.id2'));
assert.equal('`id``1`.`i``d2`', SqlString.escapeId('id`1.i`d2'));
