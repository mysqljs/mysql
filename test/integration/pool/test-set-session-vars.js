var common     = require('../../common');
var assert     = require('assert');
var Connection = require(common.lib + '/Connection');
var pool       = common.createPool();

var wasSet = false;
pool.on('connection', function(err, connection) {
  connection.query('SET SESSION sql_mode="STRICT_ALL_TABLES"');
  wasSet = true;
})

pool.getConnection(function(err, connection) {
  if (err) throw err;
  assert.equal(wasSet, true);
  pool.end();
});
