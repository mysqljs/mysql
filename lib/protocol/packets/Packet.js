var Elements = require('../elements');

module.exports = Packet;
function Packet(properties) {
  // Header
  this.length = new Elements.UnsignedNumber(3);
  this.number = new Elements.UnsignedNumber(1, properties.number);
}

// This method relies on V8 ordering (named) properties by insertation which is
// not ECMA standardized yet (but de-facto standard). Otherwise we'd have to
// create a lot of additional objects for each packet to have an ordered
// key -> value mapping.
//
// See:
// * http://wiki.ecmascript.org/doku.php?id=strawman:enumeration
// * https://mail.mozilla.org/pipermail/es-discuss/2011-March/012965.html
// * http://code.google.com/p/v8/issues/detail?id=164
Packet.prototype.toBuffer = function() {
  var length = 0;
  for (var key in this) {
    if (!this.hasOwnProperty(key)) continue;

    var element = this[key];
    length     += element.length;
  }

  // Exclude header size from length element
  this.length.value = length - 4;

  var buffer = new Buffer(length);

  var offset = 0;
  for (var key in this) {
    if (!this.hasOwnProperty(key)) continue;

    var element = this[key];
    element.copy(buffer, offset);

    offset += element.length;
  }

  return buffer;
};
