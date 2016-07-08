var Sequence = require('./Sequence');
var Util     = require('util');
var Packets  = require('../packets');

module.exports = ResetConnection;
Util.inherits(ResetConnection, Sequence);

function ResetConnection(callback) {
  Sequence.call(this, callback);
}

ResetConnection.prototype.start = function() {
  this.emit('packet', new Packets.ComResetConnectionPacket);
};
