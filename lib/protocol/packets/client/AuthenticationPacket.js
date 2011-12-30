var _              = require('underscore');
var OutgoingPacket = require('../../../OutgoingPacket');

// Client_Authentication_Packet (MySql >= 4.1)
// http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#Client_Authentication_Packet
module.exports = AuthenticationPacket;
function AuthenticationPacket(properties) {
  this.number        = null;
  this.token         = null;
  this.user          = null;
  this.database      = null;
  this.flags         = null;
  this.maxPacketSize = null;
  this.charsetNumber = null;

  _.extend(this, properties);
}

AuthenticationPacket.prototype.toBuffer = function() {
  var packetSize = (
    4 + 4 + 1 + 23 +
    this.user.length + 1 +
    this.token.length + 1 +
    this.database.length + 1
  );
  var packet = new OutgoingPacket(packetSize, this.number);

  packet.writeNumber(4, this.flags);
  packet.writeNumber(4, this.maxPacketSize);
  packet.writeNumber(1, this.charsetNumber);
  packet.writeFiller(23);
  packet.writeNullTerminated(this.user);
  packet.writeLengthCoded(this.token);
  packet.writeNullTerminated(this.database);

  return packet.buffer;
};
