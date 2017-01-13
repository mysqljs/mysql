var Sequence = require('./Sequence');
var Util     = require('util');
var Packets  = require('../packets');

module.exports = Ping;
Util.inherits(Ping, Sequence);

function Ping(options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  Sequence.call(this, options, callback);
}

Ping.prototype.start = function() {
  this.emit('packet', new Packets.ComPingPacket());
};
