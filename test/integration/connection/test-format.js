var path   = require('path');
var assert = require('assert');
var common = require('../../common');
var lib    = require(path.resolve(common.lib, '../index'));

assert.equal(
	lib.format('SELECT * FROM ?? WHERE ?? = ?', [ 'table', 'property', 123 ]),
	'SELECT * FROM `table` WHERE `property` = 123'
);

assert.equal(
	lib.format('INSERT INTO ?? SET ?', [ 'table', { property: 123 } ]),
	'INSERT INTO `table` SET `property` = 123'
);
