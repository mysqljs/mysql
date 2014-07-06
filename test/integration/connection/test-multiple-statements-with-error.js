var assert = require('assert');
var common = require('../../common');

common.getTestConnection({multipleStatements: true}, function (err, connection) {
  assert.ifError(err);

  connection.query('SELECT 1; INVALID SQL; SELECT 3', function (err, results) {
    assert.ok(err);
    assert.equal(err.code, 'ER_PARSE_ERROR');
    assert.equal(results.length, 1);
    assert.deepEqual(results[0], [{1: 1}]);

    connection.end(assert.ifError);
  });
});
