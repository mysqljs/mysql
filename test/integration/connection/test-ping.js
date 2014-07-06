var assert = require('assert');
var common = require('../../common');

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  connection.ping(function (err) {
    assert.ifError(err);
    connection.end(assert.ifError);
  });
});
