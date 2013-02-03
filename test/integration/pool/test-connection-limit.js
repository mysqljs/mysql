var common = require('../../common');
var assert = require('assert');
var pool   = common.createPool({
  connectionLimit    : 1,
  waitForConnections : false
});

pool.getConnection(function(err, connection) {
  if (err) throw err;
  pool.getConnection(function(err) {
    assert.ok(err);

    var shouldGetConnection        = false;
    pool.config.waitForConnections = true;
    pool.getConnection(function(err, connection2) {
      if (err) throw err;
      assert.ok(shouldGetConnection);
      assert.strictEqual(connection, connection2);

      pool.end();
    });

    shouldGetConnection = true;
    connection.end();
  });
});
