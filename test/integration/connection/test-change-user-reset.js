var assert = require('assert');
var common = require('../../common');

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  connection.query('SET @custom = 2', assert.ifError);

  connection.query('SELECT @custom', function (err, result) {
    assert.ifError(err);
    assert.strictEqual(result[0]['@custom'], 2);
  });

  connection.changeUser(assert.ifError);

  connection.query('SELECT @custom', function (err, result) {
    assert.ifError(err);
    assert.strictEqual(result[0]['@custom'], null);
  });

  connection.end(assert.ifError);
});
