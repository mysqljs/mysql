var Util     = require('util');
var Elements = require('../elements');

module.exports = Packet;
function Packet(properties) {
  // Header Elements:
  // length is the size of the packet in bytes excluding the header size
  this.length = new Elements.UnsignedNumber(3);
  // number is the sequence number of this packet
  this.number = new Elements.UnsignedNumber(1, properties.number);

  // Used to keep a list of unfilled elements by #write
  this._elements = null;
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
Packet.prototype.write = function(buffer) {
  var elements = (!this._elements)
      ? this._elements = this.elements()
      : this._elements;

  var end   = buffer.length;
  var start = 0;

  while (start < end && elements.length) {
    var element      = elements[0];
    var bytesWritten = element.bytesWritten;
    var full         = element.write(buffer, start, end);

    start += element.bytesWritten - bytesWritten;
    if (full) elements.shift();

    console.error(this);
  }

  console.error(this);

  return 0;
};

Packet.prototype.elements = function(named) {
  var elements = [];

  for (var key in this) {
    if (!this.hasOwnProperty(key)) continue;
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

    properties[name] = element;
  });

  return '<' + this.constructor.name + ' ' + Util.inspect(properties) + '>';
};
