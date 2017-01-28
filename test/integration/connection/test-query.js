var assert = require('assert');
var common = require('../../common');

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  connection.query('SELECT 1', function (err, rows, fields) {
    assert.ifError(err);
    assert.deepEqual(rows, [{1: 1}]);
    assert.equal(fields[0].name, '1');
  });

  connection.query({ sql: 'SELECT ?' }, [ 1 ], function (err, rows, fields) {
    assert.ifError(err);
    assert.deepEqual(rows, [{1: 1}]);
    assert.equal(fields[0].name, '1');
  });

  connection.end(assert.ifError);
});
