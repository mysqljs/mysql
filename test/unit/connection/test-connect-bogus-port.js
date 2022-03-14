var assert = require('assert');
var common = require('../../common');

var connection = common.createConnection({
  port: 99999
});

connection.connect(function (err) {
  assert.ok(err);
  assert.strictEqual(err.fatal, true);
  assert.ok(
    err.code === 'ECONNREFUSED' /* Node.js < 0.12 */ ||
    err.code === 'ERR_SOCKET_BAD_PORT' /* Node.js > 8 */ ||
    err.name === 'RangeError'
  );
  connection.destroy();
});
