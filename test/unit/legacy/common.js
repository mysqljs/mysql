var newCommon = require('../../common');
exports.dir = newCommon.dir;

var path = require('path');
var util = require('util');

global.TEST_DB = 'node_mysql_test';
global.TEST_TABLE = 'posts';
global.TEST_FIXTURES = path.join(__dirname, '../fixture');

global.Gently = require('gently');
global.assert = require('assert');
global.p = function(val) {
  util.error(util.inspect(val));
};

global.GENTLY = new Gently();
global.HIJACKED = GENTLY.hijacked;

// Stupid new feature in node that complains about gently attaching too many
// listeners to process 'exit'. This is a workaround until I can think of a
// better way to deal with this.
if (process.setMaxListeners) {
  process.setMaxListeners(Infinity);
}
