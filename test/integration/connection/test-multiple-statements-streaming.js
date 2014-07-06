var assert = require('assert');
var common = require('../../common');

common.getTestConnection({multipleStatements: true}, function (err, connection) {
  assert.ifError(err);

  var count = 0;
  var query = connection.query('SELECT 1; INVALID SQL; SELECT 3');

  query.on('error', function (err) {
    assert.ok(err);
    assert.equal(err.code, 'ER_PARSE_ERROR');
    assert.equal(err.index, 1);
    assert.equal(count, 1);

    connection.end(assert.ifError);
  });

  query.on('result', function (result) {
    count++;
    assert.deepEqual(result, {1: 1});
  });
});
