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
  console.error('<- %s: %j', packetName, packet);
};

Debugger.prototype.outgoingPacket = function(packet) {
  // @TODO REFACTOR WIP, REMOVE
  var buffer = (typeof packet.toBuffer === 'function')
    ? packet.toBuffer()
    : packet.buffer;

  console.error('-> %s', buffer.inspect());
};
