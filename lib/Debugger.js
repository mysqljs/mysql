var Parser = require('./Parser');

module.exports = Debugger;
function Debugger() {}

Debugger.prototype.incomingPacket = function(packet) {
  var packetName = null;
  for (var key in Parser) {
    if (!key.match(/_PACKET$/)) {
      continue;
    }

    if (Parser[key] == packet.type) {
      packetName = key;
      break;
    }
  }
  console.log('<- %s: %j', packetName, packet);
};

Debugger.prototype.outgoingPacket = function(packet) {
  console.log('-> %s', packet.buffer.inspect());
};
