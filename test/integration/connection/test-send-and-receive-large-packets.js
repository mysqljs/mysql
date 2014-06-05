var common     = require('../../common');
var connection = common.createConnection();
var crypto     = require('crypto');
var assert     = require('assert');

connection.connect(function(err) {
  if (err) throw err;

  getMaxAllowedPacket();
});


var oldMaxAllowedPacket;
function getMaxAllowedPacket() {
  connection.query('SHOW VARIABLES WHERE Variable_name = ?', ['max_allowed_packet'], function(err, rows) {
    if (err) throw err;

    oldMaxAllowedPacket = Number(rows[0].Value);

    increaseMaxAllowedPacketIfNeeded();
  });
}

function increaseMaxAllowedPacketIfNeeded() {
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

      triggerLargeQueryAndResponsePackets();
    });
  });
}

var buffer;
var length   = (Math.pow(256, 3) / 2) + 10; // Half, because of hex encoding
var rows     = [];
var trailing = 'tailing text';

function triggerLargeQueryAndResponsePackets() {
  var random = crypto.pseudoRandomBytes || crypto.randomBytes; // Depends on node.js version
  var sql    = 'SELECT ? as bigField, ? as trailingField';

  random(length, function(err, buf) {
    if (err) throw err;
    assert.equal(buf.length, length);

    connection.query(sql, [buf, trailing], function(err, _rows) {
      if (err) throw err;

      buffer = buf;
      rows = _rows;

      resetMaxAllowedPacket();
    });
  });
}

function resetMaxAllowedPacket() {
  connection.query('SET GLOBAL max_allowed_packet = ?', [oldMaxAllowedPacket], function(err, rows) {
    if (err) {
      err.message = 'Could not reset max_allowed_packet size, please check your server settings: ' + err.message;
      throw err;
    }
  });

  connection.end();
}


process.on('exit', function() {
  assert.equal(rows.length, 1);
  assert.equal(rows[0].trailingField, trailing);
  assert.equal(rows[0].bigField.length, buffer.length);
  assert.equal(rows[0].bigField.toString('base64'), buffer.toString('base64'));
});
