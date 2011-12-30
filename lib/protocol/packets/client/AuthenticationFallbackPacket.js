var Packet   = require('../Packet');
var Util     = require('util');
var Elements = require('../../elements');

// This is the follow-up packet we send to a server that wants to use the old
// authentication mechanism after we initially replied to his greeting with
// an AuthenticationPacket.
//
// This seems to currently be undocumented in the MySql protocol, I found it
// by sniffing the mysql command line client.

module.exports = AuthenticationFallbackPacket;
Util.inherits(AuthenticationFallbackPacket, Packet);
function AuthenticationFallbackPacket(properties) {
  this.scrambleBuff = new Elements.LengthCodedString(properties.scrambleBuff);
}
