var Packet      = require('./Packet');
var OkPacket    = require('./OkPacket');
var ErrorPacket = require('./ErrorPacket');
var Util        = require('util');
var Elements    = require('../elements');

/*
 * Types Of Result Packets
 *
 * A "result packet" is a packet that goes from the server to the client in
 * response to a Client Authentication Packet or Command Packet. To distinguish
 * between the types of result packets, a client must look at the first byte in
 * the packet. We will call this byte "field_count" in the description of each
 * individual package, although it goes by several names.
 *
 * Type Of Result Packet       Hexadecimal Value Of First Byte (field_count)
 *  ---------------------       ---------------------------------------------
 *
 *  OK Packet                   00
 *  Error Packet                ff
 *  Result Set Packet           1-250 (first byte of Length-Coded Binary)
 *  Field Packet                1-250 ("")
 *  Row Data Packet             1-250 ("")
 *  EOF Packet                  fe
 *
 *  -- http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#Types_Of_Result_Packets
 */

module.exports = ResultPacket;
Util.inherits(ResultPacket, Packet);
function ResultPacket(properties) {
  properties = properties || {};
  Packet.call(this, properties);

  this.push([
    this.fieldCount = new Elements.UnsignedNumber(1, properties.fieldCount),
    this._determinePacketType.bind(this),
  ]);
}

ResultPacket.prototype._determinePacketType = function() {
  var packet;
  switch (this.fieldCount.value) {
    case 0x00:
      packet = new OkPacket(this);
      break;
    case 0xff:
      packet = new ErrorPacket(this);
      break;
    //case 0xfe:
    default: throw new Error('ResultPacket.NotYetImplemented: Result Set Packet, Field Packet or Row Data Packet.');
  }

  this.push(packet);
};

ResultPacket.prototype.toResult = function() {
  return this._items[this._index - 1];
};
