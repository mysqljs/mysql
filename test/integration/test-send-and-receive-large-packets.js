var common     = require('../common');
var connection = common.createConnection();
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

  console.log('increasing max_allowed_packet to %s', newMaxAllowedPacket);

  connection.query('SET GLOBAL max_allowed_packet = ?', [newMaxAllowedPacket], function(err, rows) {
    if (err) throw err;

    console.log('increased max_allowed_packet', arguments);
    triggerLargeQueryAndResponsePackets();
  });
}

var rows = [];
var length = Math.pow(256, 3) / 2; // Half, because of hex encoding
var buffer = new Buffer(length);
var sql    = 'SELECT ? as bigField';

function triggerLargeQueryAndResponsePackets() {
  connection.query(sql, [buffer], function(err, _rows) {
    if (err) throw err;

    rows = _rows;

    resetMaxAllowedPacket();
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
  assert.equal(rows[0].bigField.length, length);
});
