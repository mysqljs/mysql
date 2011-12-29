var Auth           = require('../Auth');
var OutgoingPacket = require('../OutgoingPacket');

// Client_Authentication_Packet (MySql < 4.1)
// http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#Client_Authentication_Packet
//
// This is the follow-up packet we send to a server that wants to use the old
// authentication mechanism after we initially replied to his greeting with
// an AuthenticationPacket.
module.exports = LegacyAuthenticationPacket;
function LegacyAuthenticationPacket(properties) {
  this._number         = properties.number;
  this._scrambleBuffer = properties.scrambleBuffer;
}

LegacyAuthenticationPacket.prototype.toBuffer = function() {
  var token = Auth.scramble323(this._scrambleBuffer, this._password);
  var packetSize = (
    token.length + 1
  );
  var packet = new OutgoingPacket(packetSize, this._number);

  // I could not find any official documentation for this, but from sniffing
  // the mysql command line client, I think this is the right way to send the
  // scrambled token after receiving the USE_OLD_PASSWORD_PROTOCOL_PACKET.
  packet.write(token);
  packet.writeFiller(1);

  return packet.buffer;
};
