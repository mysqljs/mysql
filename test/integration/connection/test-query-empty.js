var assert = require('assert');
var common = require('../../common');

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  connection.query(function (err) {
    assert.ok(err);
    assert.equal(err.code, 'ER_EMPTY_QUERY');
    connection.end(assert.ifError);
  });
});
