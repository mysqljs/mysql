var IEEE_754_BINARY_64_PRECISION = Math.pow(2, 53);
var MAX_PACKET_LENGTH            = Math.pow(2, 24) - 1;
var PacketHeader                 = require('./PacketHeader');

module.exports = Parser;
function Parser(options) {
  options = options || {};

  this._buffer            = new Buffer(0);
  this._longPacketBuffers = [];
  this._offset            = 0;
  this._packetEnd         = null;
  this._packetHeader      = null;
  this._onPacket          = options.onPacket || function() {};
  this._nextPacketNumber  = 0;
  this._encoding          = 'utf-8';
  this._paused            = false;
}

Parser.prototype.write = function(buffer) {
  this.append(buffer);

  while (true) {
    if (this._paused) {
      return;
    }

    if (!this._packetHeader) {
      if (this._bytesRemaining() < 4) {
        break;
      }

      this._packetHeader = new PacketHeader(
        this.parseUnsignedNumber(3),
        this.parseUnsignedNumber(1)
      );

      this._trackAndVerifyPacketNumber(this._packetHeader.number);
    }

    if (this._bytesRemaining() < this._packetHeader.length) {
      break;
    }

    this._packetEnd = this._offset + this._packetHeader.length;

    if (this._packetHeader.length === MAX_PACKET_LENGTH) {
      this._longPacketBuffers.push(this._buffer.slice(this._offset, this._packetEnd));

      this._advanceToNextPacket();
      continue;
    }

    this._combineLongPacketBuffers();

    // Try...finally to ensure exception safety. Unfortunately this is costing
    // us up to ~10% performance in some benchmarks.
    var hadException = true;
    try {
      this._onPacket(this._packetHeader);
      hadException = false;
    } finally {
      this._advanceToNextPacket();

      // If we had an exception, the parser while loop will be broken out
      // of after the finally block. So we need to make sure to re-enter it
      // to continue parsing any bytes that may already have been received.
      if (hadException) {
        process.nextTick(this.write.bind(this));
      }
    }
  }
};

Parser.prototype.append = function(newBuffer) {
  // If resume() is called, we don't pass a buffer to write()
  if (!newBuffer) {
    return;
  }

  var oldBuffer = this._buffer;
  var bytesRemaining = this._bytesRemaining();
  var newLength = bytesRemaining + newBuffer.length;

  var combinedBuffer = (this._offset > newLength)
    ? oldBuffer.slice(0, newLength)
    : new Buffer(newLength);

  oldBuffer.copy(combinedBuffer, 0, this._offset);
  newBuffer.copy(combinedBuffer, bytesRemaining);

  this._buffer = combinedBuffer;
  this._offset = 0;
};

Parser.prototype.pause = function() {
  this._paused = true;
};

Parser.prototype.resume = function() {
  this._paused = false;

  // nextTick() to avoid entering write() multiple times within the same stack
  // which would cause problems as write manipulates the state of the object.
  process.nextTick(this.write.bind(this));
};

Parser.prototype.peak = function() {
  return this._buffer[this._offset];
};

Parser.prototype.parseUnsignedNumber = function(bytes) {
  var bytesRead = 0;
  var value     = 0;

  while (bytesRead < bytes) {
    var byte = this._buffer[this._offset++];

    value += byte * Math.pow(256, bytesRead);

    bytesRead++;
  }

  return value;
};

Parser.prototype.parseLengthCodedString = function() {
  var length = this.parseLengthCodedNumber();

  if (length === null) {
    return null;
  }

  return this.parseString(length);
};

Parser.prototype.parseLengthCodedBuffer = function() {
  var length = this.parseLengthCodedNumber();

  if (length === null) {
    return null;
  }

  return this.parseBuffer(length);
};

Parser.prototype.parseLengthCodedNumber = function() {
  var byte = this._buffer[this._offset++];

  if (byte <= 251) {
    return (byte === 251)
      ? null
      : byte;
  }

  var length;
  if (byte === 252) {
    length = 2;
  } else if (byte === 253) {
    length = 3;
  } else if (byte === 254) {
    length = 8;
  } else {
    throw new Error('parseLengthCodedNumber: Unexpected first byte: ' + byte);
  }

  var value = 0;
  for (var bytesRead = 0; bytesRead < length; bytesRead++) {
    var byte = this._buffer[this._offset++];
    value += Math.pow(256, bytesRead) * byte;
  }

  if (value >= IEEE_754_BINARY_64_PRECISION) {
    throw new Error(
      'parseLengthCodedNumber: JS precision range exceeded, ' +
      'number is >= 53 bit: "' + value + '"'
    );
  }

  return value;
};

Parser.prototype.parseFiller = function(length) {
  return this.parseBuffer(length);
};

Parser.prototype.parseNullTerminatedBuffer = function() {
  var end      = this._nullByteOffset();
  var value    = this._buffer.slice(this._offset, end);
  this._offset = end + 1;

  return value;
};

Parser.prototype.parseNullTerminatedString = function() {
  var end      = this._nullByteOffset();
  var value    = this._buffer.toString(this._encoding, this._offset, end)
  this._offset = end + 1;

  return value;
};

Parser.prototype._nullByteOffset = function() {
  var offset = this._offset;

  while (this._buffer[offset] !== 0x00) {
    offset++;

    if (offset >= this._buffer.length) {
      throw new Error('Offset of null terminated string not found.');
    }
  }

  return offset;
};

Parser.prototype.parsePacketTerminatedString = function() {
  var length = this._packetEnd - this._offset;
  return this.parseString(length);
};

Parser.prototype.parseBuffer = function(length) {
  var buffer = this._buffer.slice(this._offset, this._offset + length);

  this._offset += length;
  return buffer;
};

Parser.prototype.parseString = function(length) {
  var offset = this._offset;
  var end = offset + length;
  var value = this._buffer.toString(this._encoding, offset, end);

  this._offset = end;
  return value;
};

Parser.prototype.reachedPacketEnd = function() {
  return this._offset === this._packetEnd;
};

Parser.prototype._bytesRemaining = function() {
  return this._buffer.length - this._offset;
};

Parser.prototype._trackAndVerifyPacketNumber = function(number) {
  if (number !== this._nextPacketNumber) {
    var err = new Error(
      'Packets out of order. Got: ' + number + ' ' +
      'Expected: ' + this._nextPacketNumber
    );

    err.code = 'PROTOCOL_PACKETS_OUT_OF_ORDER';

    throw err;
  }

  this.incrementPacketNumber();
};

Parser.prototype.incrementPacketNumber = function() {
  var currentPacketNumber = this._nextPacketNumber;
  this._nextPacketNumber = (this._nextPacketNumber + 1) % 256;

  return currentPacketNumber;
};

Parser.prototype.resetPacketNumber = function() {
  this._nextPacketNumber = 0;
};

Parser.prototype.packetLength = function() {
  return this._longPacketBuffers.reduce(function(length, buffer) {
    return length + buffer.length;
  }, this._packetHeader.length);
};

Parser.prototype._combineLongPacketBuffers = function() {
  if (!this._longPacketBuffers.length) {
    return;
  }

  var trailingPacketBytes = this._buffer.length - this._packetEnd;

  var length = this._longPacketBuffers.reduce(function(length, buffer) {
    return length + buffer.length;
  }, this._bytesRemaining());

  var combinedBuffer = new Buffer(length);

  var offset = this._longPacketBuffers.reduce(function(offset, buffer) {
    buffer.copy(combinedBuffer, offset);
    return offset + buffer.length;
  }, 0);

  this._buffer.copy(combinedBuffer, offset, this._offset);

  this._buffer            = combinedBuffer;
  this._longPacketBuffers = [];
  this._offset            = 0;
  this._packetEnd         = this._buffer.length - trailingPacketBytes;
};

Parser.prototype._advanceToNextPacket = function() {
  this._offset       = this._packetEnd;
  this._packetHeader = null;
  this._packetEnd    = null;
};
