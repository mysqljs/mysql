var assert = require('assert');
var common = require('../../common');

common.getTestConnection({ rowsAsArray: true }, function (err, connection) {
  assert.ifError(err);

  connection.query('SELECT 1', function (err, rows) {
    assert.ifError(err);
    assert.deepEqual(rows, [[1]]);
  });

  connection.query({ sql: 'SELECT ?' }, [ 1 ], function (err, rows) {
    assert.ifError(err);
    assert.deepEqual(rows, [[1]]);
  });

  connection.query({
    sql         : 'SELECT ?',
    rowsAsArray : false
  }, [ 1 ], function (err, rows) {
    assert.ifError(err);
    assert.deepEqual(rows, [{1: 1}]);
  });

  connection.query({ sql: 'SELECT ?' }, [ 1 ], function (err, rows) {
    assert.ifError(err);
    assert.deepEqual(rows, [[1]]);
  });

  connection.end(assert.ifError);
});
