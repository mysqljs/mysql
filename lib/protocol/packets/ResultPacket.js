 // http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#Types_Of_Result_Packets

var _        = require('underscore');
var Util     = require('util');
var Elements = require('../elements');
var Packet   = require('./Packet');

var Packets = {
  ResultSetHeaderPacket : require('./ResultSetHeaderPacket'),
  OkPacket              : require('./OkPacket'),
  ErrorPacket           : require('./ErrorPacket'),
  FieldPacket           : require('./FieldPacket'),
  EofPacket             : require('./EofPacket'),
};

module.exports = ResultPacket;
Util.inherits(ResultPacket, Packet);
function ResultPacket(properties) {
  properties = properties || {};
  Packet.call(this, properties);

  this._ambiguousPacket = properties.ambiguousPacket || Packets.ResultSetHeaderPacket;
  this._ambiguousOptions = properties.ambiguousOptions || {};

  this.push([
    this.fieldCount = new Elements.UnsignedNumber(1, properties.fieldCount),
    this._determinePacketType.bind(this),
  ]);
}

ResultPacket.prototype._determinePacketType = function() {
  var packet;
  switch (this.fieldCount.value) {
    case 0x00:
      packet = new Packets.OkPacket(this);
      break;
    case 0xff:
      packet = new Packets.ErrorPacket(this);
      break;
    case 0xfe:
      packet = new Packets.EofPacket(this);
      break;
    default:
      packet = new this._ambiguousPacket(_.extend({
        length       : this.length,
        number       : this.number,
        bytesWritten : this.bytesWritten - 1,
        index        : this._index - 1,
      }, this._ambiguousOptions));

      packet.parse([this.fieldCount.value], 0, 1);
      break;
  }

  this.push(packet);
};

ResultPacket.prototype.toResult = function() {
  return this._items[this._index - 1];
};
