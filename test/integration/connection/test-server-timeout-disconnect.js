var after  = require('after');
var assert = require('assert');
var common = require('../../common');

var timeout = setTimeout(function () {
  throw new Error('test timeout');
}, 2000);

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  var done = after(2, function () {
    clearTimeout(timeout);
  });

  connection.query('SET wait_timeout = 1', assert.ifError);

  connection.on('end', function (err) {
    assert.strictEqual(err.code, 'PROTOCOL_CONNECTION_LOST');
    assert.strictEqual(err.fatal, true);
    done();
  });

  connection.on('error', function (err) {
    assert.strictEqual(err.code, 'PROTOCOL_CONNECTION_LOST');
    assert.strictEqual(err.fatal, true);
    done();
  });
});
