var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var server = common.createFakeServer();
var sqlQuery = Object.create(null, {
  sql: {
    enumerable : false,
    value      : 'SELECT ?',
    writable   : false
  },
  values: {
    enumerable : false,
    value      : [42],
    writable   : false
  }
});

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  connection.query(sqlQuery, function (err, rows) {
    assert.ifError(err);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0]['42'], 42);
    connection.destroy();
    server.destroy();
  });
});
