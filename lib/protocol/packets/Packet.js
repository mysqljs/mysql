var Util     = require('util');
var Elements = require('../elements');
var Parser   = require('../parser');

module.exports = Packet;
function Packet(properties) {
  // Header Elements:
  // length is the size of the packet in bytes excluding the header size
  this.length = new Elements.UnsignedNumber(3, properties.length);
  // number is the sequence number of this packet
  this.number = new Elements.UnsignedNumber(1, properties.number);

  this.bytesWritten = properties.bytesWritten || 0;
}

// This method relies on V8 ordering (named) properties by insertation time
// which is not ECMA standardized yet (but de-facto standard). Otherwise we'd
// have to create a lot of additional objects for each packet to have an
// ordered key -> value mapping.
//
// See:
// * http://wiki.ecmascript.org/doku.php?id=strawman:enumeration
// * https://mail.mozilla.org/pipermail/es-discuss/2011-March/012965.html
// * http://code.google.com/p/v8/issues/detail?id=164
Packet.prototype.toBuffer = function() {
  var length   = 0;
  var elements = this.elements();

  for (var i = 0; i < elements.length; i++) {
    var element = elements[i];
    length     += element.length;
  }

  // Exclude header size from length element
  this.length.value = length - 4;

  var buffer = new Buffer(length);

  var offset = 0;
  for (var i = 0; i < elements.length; i++) {
    var element = elements[i];

    element.copy(buffer, offset);

    offset += element.length;
  }

  return buffer;
};

// Fills an element with the bytes given in buffer
Packet.prototype.parse = function(buffer, offset, end) {
  var self = this;

  if (!this._parser) {
    this._parser = new Parser();

    this
      .elements()
      .forEach(function(element, index, elements) {
        if (element.bytesWritten) {
          return;
        }

        self._parser.push(element);
      });
  }

  var start = offset;
  offset = self._parser.write(buffer, offset, end);

  this.bytesWritten += offset - start;

  return offset;
};

Packet.prototype.isDone = function() {
  if (this.bytesWritten === this.length.value + 4) return true;
  if (this._parser._items.length === 0) return true;

  return false;
};

// Copies a packet into another one. Useful for packets where the type is
// not entirely clear until some data has been parsed (e.g. result packets).
Packet.prototype.copy = function(target) {
  for (var key in this) {
    if (!this.hasOwnProperty(key)) continue;
    target[key] = this[key];
  }
  return target;
};

Packet.prototype.elements = function(named) {
  var elements = [];

  for (var key in this) {
    var element = this[key];
    if (!(element instanceof Elements.Element)) continue;

    if (!named) {
      elements.push(element);
    } else {
      elements.push({name: key, element: element});
    }
  }

  return elements;
};

Packet.prototype.inspect = function() {
  var elements  = this.elements(true);
  var properties = {};

  elements.forEach(function(element) {
    var name    = element.name;
    var element = element.element;

    properties[name] = element.value;
  });

  properties.bytesWritten = this.bytesWritten;

  return '<' + this.constructor.name + ' ' + Util.inspect(properties) + '>';
};
