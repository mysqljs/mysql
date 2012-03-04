var Util     = require('util');
var Elements = require('../elements');
var Parser   = require('../parser');

module.exports = Packet;
Util.inherits(Packet, Parser);
function Packet(properties) {
  Parser.call(this, properties);

  this.push([
    // Header Elements:
    // length is the size of the packet in bytes excluding the header size
    this.length = new Elements.UnsignedNumber(3, properties.length),
    // number is the sequence number of this packet
    this.number = new Elements.UnsignedNumber(1, properties.number),
  ]);

  this.bytesWritten = properties.bytesWritten || 0;
}

Packet.prototype.toBuffer = function() {
  var length = this._items.reduce(function(length, item) {
    return length + item.length;
  }, 0);

  this.length.value = length - 4;

  var buffer = new Buffer(length);

  this._items.reduce(function(offset, item) {
    item.copy(buffer, offset);
    return offset + item.length;
  }, 0);

  return buffer;
};

Packet.prototype.isDone = function() {
  if (this.bytesWritten === this.length.value + 4) return true;
  if (this._items.length === this._index) return true;

  return false;
};

Packet.prototype.inspect = function() {
  var properties = {};
  for (var property in this) {
    var item = this[property];

    if (this._items.indexOf(item) < 0) {
      continue;
    }

    properties[property] = item.value;
  }

  properties.bytesWritten = this.bytesWritten;

  return '<' + this.constructor.name + ' ' + Util.inspect(properties) + '>';
};
