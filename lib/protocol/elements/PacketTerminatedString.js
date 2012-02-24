/*
 * Not documented as an element in the MySql protocol, but needed for some
 * packets. Represents a string / buffer terminated by the end of the packet.
 *
 * IMO this is leak in the protocol abstraction as elements should not know
 * about the packet they are enclosed in ...
 */
var Util         = require('util');
var Element      = require('./Element');
var StringWriter = require('../util/StringWriter');
var BufferWriter = require('../util/BufferWriter');

module.exports = PacketTerminatedString;
Util.inherits(PacketTerminatedString, Element);
function PacketTerminatedString(encoding, value, packet) {
  if (value instanceof this.constructor) return value;

  Element.call(this);

  this.encoding = encoding;
  this.value    = value;
  this._packet  = packet;

  if (value === undefined) {
    this.length = undefined;
  } else if (!encoding) {
    this.length = value.length;
  } else {
    this.length = Buffer.byteLength(value, encoding) + 1;
  }

  // Created by #parse as needed
  this._parser = null;
}

// NOTE: Only works for string values right now, not buffers
PacketTerminatedString.prototype.copy = function(buffer, offset) {
  buffer.write(this.value, offset, this.encoding);
};

// @TODO Refactor, ripped from NullTerminatedString
PacketTerminatedString.prototype.parse = function(buffer, start, end) {
  if (!this.length) {
    this.length = this._packet.length.value - this._packet.bytesWritten;
  }

  if (!this._parser) {
    this._parser = (this.encoding)
      ? new StringWriter(this.encoding)
      : new BufferWriter();
  }

  var lastWrite = false;
  var remaining = this.length + this.bytesWritten;
  if (end - start >= remaining) {
    end = start + remaining;
    lastWrite = true;
  }

  buffer = buffer.slice(start, end);
  this.value = this._parser.write(buffer, lastWrite);
  this.bytesWritten += (end - start);

  return lastWrite;
};
