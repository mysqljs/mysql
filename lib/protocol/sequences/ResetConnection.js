var Sequence = require('./Sequence');
var Util     = require('util');
var Packets  = require('../packets');

module.exports = ResetConnection;

function ResetConnection(callback) {
  Sequence.call(this, callback);
}

Util.inherits(ResetConnection, Sequence);

ResetConnection.prototype.start = function start() {
  this.emit('packet', new Packets.ComResetConnectionPacket);
};
