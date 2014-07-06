var assert = require('assert');
var common = require('../../common');
var crypto = require('crypto');

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  getMaxAllowedPacket(connection);
});


var oldMaxAllowedPacket;
function getMaxAllowedPacket(connection) {
  connection.query('SHOW VARIABLES WHERE Variable_name = ?', ['max_allowed_packet'], function(err, rows) {
    if (err) throw err;

    oldMaxAllowedPacket = Number(rows[0].Value);

    increaseMaxAllowedPacketIfNeeded(connection);
  });
}

function increaseMaxAllowedPacketIfNeeded(connection) {
  // Our test generates a SQL query a few bytes larger than 16 MB, but lets
  // leave a little margin:
  var minMaxAllowedPacket = 20 * 1024 * 1024;

  var newMaxAllowedPacket = (oldMaxAllowedPacket < minMaxAllowedPacket)
    ? minMaxAllowedPacket
    : oldMaxAllowedPacket;

  connection.query('SET GLOBAL max_allowed_packet = ?', [newMaxAllowedPacket], function(err, rows) {
    if (err) throw err;


    // We need to re-connect for this change to take effect, bah
    connection.end();
    connection = common.createConnection();

    // We need to wait for the re-connect to happen before starting the actual
    // test. That's because our buffer to hex shim in 0.4.x takes ~12 sec on
    // TravisCI, causing a MySQL connection timeout otherwise.
    connection.connect(function(err) {
      if (err) throw err;

      triggerLargeQueryAndResponsePackets(connection);
    });
  });
}

var length   = (Math.pow(256, 3) / 2) + 10; // Half, because of hex encoding
var trailing = 'tailing text';

function triggerLargeQueryAndResponsePackets(connection) {
  var random = crypto.pseudoRandomBytes || crypto.randomBytes; // Depends on node.js version
  var sql    = 'SELECT ? as bigField, ? as trailingField';

  random(length, function (err, buf) {
    assert.ifError(err);
    assert.equal(buf.length, length);

    connection.query(sql, [buf, trailing], function (err, rows) {
      assert.ifError(err);

      connection.query('SET GLOBAL max_allowed_packet = ?', [oldMaxAllowedPacket], assert.ifError);
      connection.end(function (err) {
        assert.ifError(err);
        assert.equal(rows.length, 1);
        assert.equal(rows[0].trailingField, trailing);
        assert.equal(rows[0].bigField.length, buf.length);
        assert.equal(rows[0].bigField.toString('base64'), buf.toString('base64'));
      });
    });
  });
}
