var assert = require('assert');
var common = require('../../common');

common.getTestConnection({multipleStatements: true}, function (err, connection) {
  assert.ifError(err);

  connection.query('SELECT 1; SELECT 2; SELECT 3', function (err, results) {
    assert.ifError(err);
    assert.equal(results.length, 3);
    assert.deepEqual(results[0], [{1: 1}]);
    assert.deepEqual(results[1], [{2: 2}]);
    assert.deepEqual(results[2], [{3: 3}]);

    connection.end(assert.ifError);
  });
});
