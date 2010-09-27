if (global.GENTLY) require = GENTLY.hijack(require);

var Buffer = require('buffer').Buffer;

function OutgoingPacket(size, num) {
  this.buffer = new Buffer(size + 3 + 1);
  this.index = 0;
  this.writeNumber(3, size);
  this.writeNumber(1, num || 0);
};
module.exports = OutgoingPacket;

OutgoingPacket.prototype.writeNumber = function(bytes, number) {
  for (var i = 0; i < bytes; i++) {
    this.buffer[this.index++] = (number >> (i * 8)) & 0xff;
  }
};

OutgoingPacket.prototype.writeFiller = function(bytes) {
  for (var i = 0; i < bytes; i++) {
    this.buffer[this.index++] = 0;
  }
};

OutgoingPacket.prototype.write = function(bufferOrString, encoding) {
  if (typeof bufferOrString == 'string') {
    this.index += this.buffer.write(bufferOrString, this.index, encoding);
    return;
  }

  bufferOrString.copy(this.buffer, this.index, 0);
  this.index += bufferOrString.length;
};

OutgoingPacket.prototype.writeNullTerminated = function(bufferOrString, encoding) {
  this.write(bufferOrString, encoding);
  this.buffer[this.index++] = 0;
};

OutgoingPacket.prototype.writeLengthCoded = function(bufferOrStringOrNumber, encoding) {
  if (bufferOrStringOrNumber === null) {
      this.buffer[this.index++] = 251;
      return;
  }

  if (typeof bufferOrStringOrNumber == 'number') {
    if (bufferOrStringOrNumber <= 250) {
      this.buffer[this.index++] = bufferOrStringOrNumber;
      return;
    }

    // @todo support 8-byte numbers and simplify this
    if (bufferOrStringOrNumber < 0xffff) {
      this.buffer[this.index++] = 252;
      this.buffer[this.index++] = (bufferOrStringOrNumber >> 0) & 0xff;
      this.buffer[this.index++] = (bufferOrStringOrNumber >> 8) & 0xff;
    } else if (bufferOrStringOrNumber < 0xffffff) {
      this.buffer[this.index++] = 253;
      this.buffer[this.index++] = (bufferOrStringOrNumber >> 0) & 0xff;
      this.buffer[this.index++] = (bufferOrStringOrNumber >> 8) & 0xff;
      this.buffer[this.index++] = (bufferOrStringOrNumber >> 16) & 0xff;
    } else {
      throw new Error('8 byte length coded numbers not supported yet');
    }
    return;
  }

  if (bufferOrStringOrNumber instanceof Buffer) {
    this.writeLengthCoded(bufferOrStringOrNumber.length);
    this.write(bufferOrStringOrNumber);
    return;
  }

  if (typeof bufferOrStringOrNumber == 'string') {
    this.writeLengthCoded(Buffer.byteLength(bufferOrStringOrNumber, encoding));
    this.write(bufferOrStringOrNumber, encoding);
    return;
  }

  throw new Error('passed argument not a buffer, string or number: '+bufferOrStringOrNumber);
};