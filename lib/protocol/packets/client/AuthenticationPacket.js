var _        = require('underscore');
var Packet   = require('../Packet');
var Util     = require('util');
var Elements = require('../../elements');

// VERSION 4.1
// Bytes                        Name
// -----                        ----
// 4                            client_flags
// 4                            max_packet_size
// 1                            charset_number
// 23                           (filler) always 0x00...
// n (Null-Terminated String)   user
// n (Length Coded Binary)      scramble_buff (1 + x bytes)
// n (Null-Terminated String)   databasename (optional)
//
// client_flags:            CLIENT_xxx options. The list of possible flag
//                          values is in the description of the Handshake
//                          Initialisation Packet, for server_capabilities.
//                          For some of the bits, the server passed "what
//                          it's capable of". The client leaves some of the
//                          bits on, adds others, and passes back to the server.
//                          One important flag is: whether compression is desired.
//                          Another interesting one is: CLIENT_CONNECT_WITH_DB,
//                          which shows the presence of the optional databasename.
//
// max_packet_size:         the maximum number of bytes in a packet for the client
//
// charset_number:          in the same domain as the server_language field that
//                          the server passes in the Handshake Initialization packet.
//
// user:                    identification
//
// scramble_buff:           the password, after encrypting using the scramble_buff
//                          contents passed by the server (see "Password functions"
//                          section elsewhere in this document)
//                          if length is zero, no password was given
//
// databasename:            name of schema to use initially
//
// http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#Client_Authentication_Packeto

module.exports = AuthenticationPacket;
Util.inherits(AuthenticationPacket, Packet);
function AuthenticationPacket(properties) {
  Packet.call(this, properties);

  this.clientFlags   = new Elements.UnsignedNumber(4, properties.clientFlags);
  this.maxPacketSize = new Elements.UnsignedNumber(4, properties.maxPacketSize);
  this.charsetNumber = new Elements.UnsignedNumber(1, properties.charsetNumber);
  this.filler        = new Elements.Filler(23);
  this.user          = new Elements.NullTerminatedString(properties.user);
  this.scrambleBuff  = new Elements.LengthCodedString(properties.scrambleBuff);
  this.databasename  = new Elements.LengthCodedString(properties.databasename);
}
