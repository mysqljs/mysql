var assert = require('assert');
var common = require('../../common');

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  connection.changeUser({charset: 'KOI8R_GENERAL_CI'}, function (err) {
    assert.ifError(err);

    connection.query('SHOW VARIABLES LIKE \'character_set_client\'', function (err, result) {
      assert.ifError(err);
      assert.strictEqual(result[0]['Value'], 'koi8r');

      connection.destroy();
    });
  });
});
