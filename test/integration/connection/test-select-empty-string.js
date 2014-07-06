var assert = require('assert');
var common = require('../../common');

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  connection.query('SELECT ""', function (err, rows) {
    assert.ifError(err);
    assert.deepEqual(rows, [{'': ''}]);
    connection.end(assert.ifError);
  });
});
