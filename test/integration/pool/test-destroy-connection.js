var common     = require('../../common');
var assert     = require('assert');
var Connection = require(common.lib + '/Connection');
var pool       = common.createPool();

pool.getConnection(function(err, connection) {
  if (err) throw err;
  assert.strictEqual(connection, pool._allConnections[0]);
  connection.destroy();

  assert.ok(pool._allConnections.length == 0);
  assert.ok(connection._poolRemoved);
  assert.strictEqual(connection.end,     Connection.prototype.end);
  assert.strictEqual(connection.destroy, Connection.prototype.destroy);

  pool.end();
});
