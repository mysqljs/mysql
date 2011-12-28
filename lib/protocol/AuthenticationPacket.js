var Auth           = require('../Auth');
var OutgoingPacket = require('../OutgoingPacket');

// Client_Authentication_Packet (MySql >= 4.1)
// http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#Client_Authentication_Packet
module.exports = AuthenticationPacket;
function AuthenticationPacket(properties) {
  this._number         = properties.number;
  this._scrambleBuffer = properties.scrambleBuffer;
  this._password       = properties.password;
  this._user           = properties.user;
  this._database       = properties.database;
  this._flags          = properties.flags;
  this._maxPacketSize  = properties.maxPacketSize;
  this._charsetNumber  = properties.charsetNumber;
}

AuthenticationPacket.prototype.toBuffer = function() {
  var token = Auth.token(this._password, this._scrambleBuffer);
  var packetSize = (
    4 + 4 + 1 + 23 +
    this._user.length + 1 +
    token.length + 1 +
    this._database.length + 1
  );
  var packet = new OutgoingPacket(packetSize, this._number + 1);

  packet.writeNumber(4, this._flags);
  packet.writeNumber(4, this._maxPacketSize);
  packet.writeNumber(1, this._charsetNumber);
  packet.writeFiller(23);
  packet.writeNullTerminated(this._user);
  packet.writeLengthCoded(token);
  packet.writeNullTerminated(this._database);

  return packet.buffer;
};
