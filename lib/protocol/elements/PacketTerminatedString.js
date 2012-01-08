/*
 * Not documented as an element in the MySql protocol, but needed for some
 * packets. Represents a string / buffer terminated by the end of the packet.
 *
 * IMO this is leak in the protocol abstraction as elements should not know
 * about the packet they are enclosed in ...
 */
var Util         = require('util');
var Element      = require('./Element');

module.exports = PacketTerminatedString;
Util.inherits(PacketTerminatedString, Element);
function PacketTerminatedString(value, encoding) {
  Element.call(this);

  this.value    = value;
  this.encoding = encoding;

  if (value === undefined) {
    this.length = undefined;
  } else if (!encoding) {
    this.length = value.length;
  } else {
    this.length = Buffer.byteLength(value, encoding);
  }
}

PacketTerminatedString.prototype.copy = function(buffer, offset) {
  buffer.write(this.value, offset, this.encoding);
};
