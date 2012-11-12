var Sequence = require('./Sequence');
var Util     = require('util');
var Packets  = require('../packets');

module.exports = Ping;
Util.inherits(Ping, Sequence);

function Ping(callback) {
  Sequence.call(this, callback);
}

Ping.prototype.start = function() {
  this.emit('packet', new Packets.ComPingPacket);
};
