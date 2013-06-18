var common     = require('../../common');
var assert     = require('assert');
var Connection = require(common.lib + '/Connection');
var pool       = common.createPool();

pool.getConnection(function(err, connection) {
  if (err) throw err;
  assert.ok(connection instanceof Connection);
  pool.end();
});
