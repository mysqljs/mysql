var _              = require('underscore');
var OutgoingPacket = require('../../../OutgoingPacket');
var Elements       = require('../../elements');

// Client_Authentication_Packet (MySql >= 4.1)
// http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#Client_Authentication_Packet
module.exports = AuthenticationPacket;
function AuthenticationPacket(properties) {
  this.number   = properties.number;
  this.elements = [
    new Elements.UnsignedNumber(properties.flags, 4),
    new Elements.UnsignedNumber(properties.maxPacketSize, 4),
    new Elements.UnsignedNumber(properties.charsetNumber, 1),
    new Elements.Filler(23),
    new Elements.NullTerminatedString(properties.user),
    new Elements.LengthCodedString(properties.token),
    new Elements.NullTerminatedString(properties.database),
  ];
}

AuthenticationPacket.prototype.toBuffer = function() {
  var length = Elements.length(this.elements);

  var header = [
    new Elements.UnsignedNumber(length, 3),
    new Elements.UnsignedNumber(this.number, 1),
  ];

  var buffer   = new Buffer(Elements.length(header) + length);
  var elements = header.concat(this.elements);

  Elements.copy(elements, buffer);

  return buffer;
};
