var assert = require('assert');
var common = require('../../common');
var crypto = require('crypto');

if (process.platform === 'win32') {
  common.skipTest('windows sockets close immediately');
}

common.getTestConnection(function (err, conn) {
  assert.ifError(err);

  conn.query('SHOW VARIABLES WHERE Variable_name = ?', ['max_allowed_packet'], function (err, rows) {
    assert.ifError(err);
    assert.strictEqual(rows.length, 1);

    var maxAllowedPacket = Number(rows[0].Value);
    assert.ok(maxAllowedPacket > 0);

    var length = maxAllowedPacket;
    var random = crypto.pseudoRandomBytes || crypto.randomBytes; // Depends on node.js version

    random(length, function (err, buf) {
      assert.ifError(err);
      conn.query('SELECT ?', [buf], function (err) {
        assert.ok(err);
        assert.strictEqual(err.code, 'ER_NET_PACKET_TOO_LARGE');
        assert.strictEqual(err.fatal, true);
      });
    });
  });
});
