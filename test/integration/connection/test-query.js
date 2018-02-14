var assert = require('assert');
var common = require('../../common');

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  function callback (err, rows, fields) {
    assert.ifError(err);
    assert.deepEqual(rows, [{1: 1}]);
    assert.equal(fields[0].name, '1');
  }

  connection.query('SELECT 1', callback);

  connection.query({ sql: 'SELECT ?' }, [ 1 ], callback);

  connection.query`SELECT ${ 1 }`(callback);

  connection.end(assert.ifError);
});
