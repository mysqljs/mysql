var assert = require('assert');
var common = require('../../common');

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  connection.query('SET @var1 = ?', [1234], assert.ifError);

  connection.query('SELECT @var1 AS var1', function(err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].var1, 1234);

	connection.reset(function(err) {
      assert.ifError(err);

      connection.query('SELECT @var1 AS var1', function(err, rows2) {
        assert.ifError(err);
        assert.equal(rows2.length, 1);
        assert.equal(rows2[0].var1, null);
      });

      connection.end(assert.ifError);
    });
  });
});