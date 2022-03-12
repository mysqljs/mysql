var assert = require('assert');
var common = require('../../common');

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

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

  connection.query(sqlQuery, [99], function (err, rows) {
    assert.ifError(err);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0]['99'], 99);
    connection.destroy();
    server.destroy();
  });
});
