var Packet   = require('./Packet');
var Util     = require('util');
var Elements = require('../elements');

// This is the follow-up packet we send to a server that wants to use the old
// authentication mechanism after we initially replied to his greeting with
// an AuthenticationPacket.
//
// This seems to currently be undocumented in the MySql protocol, I found it
// by sniffing the mysql command line client.

module.exports = ClientAuthenticationFallbackPacket;
Util.inherits(ClientAuthenticationFallbackPacket, Packet);
function ClientAuthenticationFallbackPacket(properties) {
  Packet.call(this, properties);

  this.scrambleBuff = new Elements.LengthCodedString('utf-8', properties.scrambleBuff);
}
