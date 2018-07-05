var MAX_PACKET_LENGTH = Math.pow(2, 24) - 1;
var MUL_32BIT         = Math.pow(2, 32);
var PacketHeader      = require('./PacketHeader');
var BigNumber         = require('bignumber.js');
var Buffer            = require('safe-buffer').Buffer;
var BufferList        = require('./BufferList');

module.exports = Parser;
function Parser(options) {
  options = options || {};

  this._supportBigNumbers = options.config && options.config.supportBigNumbers;
  this._buffer            = Buffer.alloc(0);
  this._nextBuffers       = new BufferList();
  this._longPacketBuffers = new BufferList();
  this._offset            = 0;
  this._packetEnd         = null;
  this._packetHeader      = null;
  this._packetOffset      = null;
  this._onError           = options.onError || function(err) { throw err; };
  this._onPacket          = options.onPacket || function() {};
  this._nextPacketNumber  = 0;
  this._encoding          = 'utf-8';
  this._paused            = false;
}

Parser.prototype.write = function write(chunk) {
  this._nextBuffers.push(chunk);

  while (!this._paused) {
    if (!this._packetHeader) {
      if (!this._combineNextBuffers(4)) {
        break;
      }

      this._packetHeader = new PacketHeader(
        this.parseUnsignedNumber(3),
        this.parseUnsignedNumber(1)
      );

      if (this._packetHeader.number !== this._nextPacketNumber) {
        var err = new Error(
          'Packets out of order. Got: ' + this._packetHeader.number + ' ' +
          'Expected: ' + this._nextPacketNumber
        );

        err.code  = 'PROTOCOL_PACKETS_OUT_OF_ORDER';
        err.fatal = true;

        this._onError(err);
      }

      this.incrementPacketNumber();
    }

    if (!this._combineNextBuffers(this._packetHeader.length)) {
      break;
    }

    this._packetEnd    = this._offset + this._packetHeader.length;
    this._packetOffset = this._offset;

    if (this._packetHeader.length === MAX_PACKET_LENGTH) {
      this._longPacketBuffers.push(this._buffer.slice(this._packetOffset, this._packetEnd));

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
    } catch (err) {
      if (!err || typeof err.code !== 'string' || err.code.substr(0, 7) !== 'PARSER_') {
        throw err; // Rethrow non-MySQL errors
      }

      // Pass down parser errors
      this._onError(err);
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

Parser.prototype.append = function append(chunk) {
  if (!chunk || chunk.length === 0) {
    return;
  }

  // Calculate slice ranges
  var sliceEnd    = this._buffer.length;
  var sliceStart  = this._packetOffset === null
    ? this._offset
    : this._packetOffset;
  var sliceLength = sliceEnd - sliceStart;

  // Get chunk data
  var buffer = null;
  var chunks = !(chunk instanceof Array || Array.isArray(chunk)) ? [chunk] : chunk;
  var length = 0;
  var offset = 0;

  for (var i = 0; i < chunks.length; i++) {
    length += chunks[i].length;
  }

  if (sliceLength !== 0) {
    // Create a new Buffer
    buffer = Buffer.allocUnsafe(sliceLength + length);
    offset = 0;

    // Copy data slice
    offset += this._buffer.copy(buffer, 0, sliceStart, sliceEnd);

    // Copy chunks
    for (var i = 0; i < chunks.length; i++) {
      offset += chunks[i].copy(buffer, offset);
    }
  } else if (chunks.length > 1) {
    // Create a new Buffer
    buffer = Buffer.allocUnsafe(length);
    offset = 0;

    // Copy chunks
    for (var i = 0; i < chunks.length; i++) {
      offset += chunks[i].copy(buffer, offset);
    }
  } else {
    // Buffer is the only chunk
    buffer = chunks[0];
  }

  // Adjust data-tracking pointers
  this._buffer       = buffer;
  this._offset       = this._offset - sliceStart;
  this._packetEnd    = this._packetEnd !== null
    ? this._packetEnd - sliceStart
    : null;
  this._packetOffset = this._packetOffset !== null
    ? this._packetOffset - sliceStart
    : null;
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

Parser.prototype.peak = function peak(offset) {
  return this._buffer[this._offset + (offset >>> 0)];
};

Parser.prototype.parseUnsignedNumber = function parseUnsignedNumber(bytes) {
  if (bytes === 1) {
    return this._buffer[this._offset++];
  }

  var buffer = this._buffer;
  var offset = this._offset + bytes - 1;
  var value  = 0;

  if (bytes > 4) {
    var err    = new Error('parseUnsignedNumber: Supports only up to 4 bytes');
    err.offset = (this._offset - this._packetOffset - 1);
    err.code   = 'PARSER_UNSIGNED_TOO_LONG';
    throw err;
  }

  while (offset >= this._offset) {
    value = ((value << 8) | buffer[offset]) >>> 0;
    offset--;
  }

  this._offset += bytes;

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

Parser.prototype.parseLengthCodedNumber = function parseLengthCodedNumber() {
  if (this._offset >= this._buffer.length) {
    var err    = new Error('Parser: read past end');
    err.offset = (this._offset - this._packetOffset);
    err.code   = 'PARSER_READ_PAST_END';
    throw err;
  }

  var bits = this._buffer[this._offset++];

  if (bits <= 250) {
    return bits;
  }

  switch (bits) {
    case 251:
      return null;
    case 252:
      return this.parseUnsignedNumber(2);
    case 253:
      return this.parseUnsignedNumber(3);
    case 254:
      break;
    default:
      var err    = new Error('Unexpected first byte' + (bits ? ': 0x' + bits.toString(16) : ''));
      err.offset = (this._offset - this._packetOffset - 1);
      err.code   = 'PARSER_BAD_LENGTH_BYTE';
      throw err;
  }

  var low = this.parseUnsignedNumber(4);
  var high = this.parseUnsignedNumber(4);
  var value;

  if (high >>> 21) {
    value = (new BigNumber(low)).plus((new BigNumber(MUL_32BIT)).times(high)).toString();

    if (this._supportBigNumbers) {
      return value;
    }

    var err    = new Error(
      'parseLengthCodedNumber: JS precision range exceeded, ' +
      'number is >= 53 bit: "' + value + '"'
    );
    err.offset = (this._offset - this._packetOffset - 8);
    err.code   = 'PARSER_JS_PRECISION_RANGE_EXCEEDED';
    throw err;
  }

  value = low + (MUL_32BIT * high);

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
  var value    = this._buffer.toString(this._encoding, this._offset, end);
  this._offset = end + 1;

  return value;
};

Parser.prototype._nullByteOffset = function() {
  var offset = this._offset;

  while (this._buffer[offset] !== 0x00) {
    offset++;

    if (offset >= this._buffer.length) {
      var err    = new Error('Offset of null terminated string not found.');
      err.offset = (this._offset - this._packetOffset);
      err.code   = 'PARSER_MISSING_NULL_BYTE';
      throw err;
    }
  }

  return offset;
};

Parser.prototype.parsePacketTerminatedBuffer = function parsePacketTerminatedBuffer() {
  var length = this._packetEnd - this._offset;
  return this.parseBuffer(length);
};

Parser.prototype.parsePacketTerminatedString = function() {
  var length = this._packetEnd - this._offset;
  return this.parseString(length);
};

Parser.prototype.parseBuffer = function(length) {
  var response = Buffer.alloc(length);
  this._buffer.copy(response, 0, this._offset, this._offset + length);

  this._offset += length;
  return response;
};

Parser.prototype.parseString = function(length) {
  var offset = this._offset;
  var end = offset + length;
  var value = this._buffer.toString(this._encoding, offset, end);

  this._offset = end;
  return value;
};

Parser.prototype.parseGeometryValue = function() {
  var buffer = this.parseLengthCodedBuffer();
  var offset = 4;

  if (buffer === null || !buffer.length) {
    return null;
  }

  function parseGeometry() {
    var result = null;
    var byteOrder = buffer.readUInt8(offset); offset += 1;
    var wkbType = byteOrder ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset); offset += 4;
    switch (wkbType) {
      case 1: // WKBPoint
        var x = byteOrder ? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset); offset += 8;
        var y = byteOrder ? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset); offset += 8;
        result = {x: x, y: y};
        break;
      case 2: // WKBLineString
        var numPoints = byteOrder ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset); offset += 4;
        result = [];
        for (var i = numPoints; i > 0; i--) {
          var x = byteOrder ? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset); offset += 8;
          var y = byteOrder ? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset); offset += 8;
          result.push({x: x, y: y});
        }
        break;
      case 3: // WKBPolygon
        var numRings = byteOrder ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset); offset += 4;
        result = [];
        for (var i = numRings; i > 0; i--) {
          var numPoints = byteOrder ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset); offset += 4;
          var line = [];
          for (var j = numPoints; j > 0; j--) {
            var x = byteOrder ? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset); offset += 8;
            var y = byteOrder ? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset); offset += 8;
            line.push({x: x, y: y});
          }
          result.push(line);
        }
        break;
      case 4: // WKBMultiPoint
      case 5: // WKBMultiLineString
      case 6: // WKBMultiPolygon
      case 7: // WKBGeometryCollection
        var num = byteOrder ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset); offset += 4;
        var result = [];
        for (var i = num; i > 0; i--) {
          result.push(parseGeometry());
        }
        break;
    }
    return result;
  }
  return parseGeometry();
};

Parser.prototype.reachedPacketEnd = function() {
  return this._offset === this._packetEnd;
};

Parser.prototype.incrementPacketNumber = function() {
  var currentPacketNumber = this._nextPacketNumber;
  this._nextPacketNumber = (this._nextPacketNumber + 1) % 256;

  return currentPacketNumber;
};

Parser.prototype.resetPacketNumber = function() {
  this._nextPacketNumber = 0;
};

Parser.prototype.packetLength = function packetLength() {
  if (!this._packetHeader) {
    return null;
  }

  return this._packetHeader.length + this._longPacketBuffers.size;
};

Parser.prototype._combineNextBuffers = function _combineNextBuffers(bytes) {
  var length = this._buffer.length - this._offset;

  if (length >= bytes) {
    return true;
  }

  if ((length + this._nextBuffers.size) < bytes) {
    return false;
  }

  var buffers     = [];
  var bytesNeeded = bytes - length;

  while (bytesNeeded > 0) {
    var buffer = this._nextBuffers.shift();
    buffers.push(buffer);
    bytesNeeded -= buffer.length;
  }

  this.append(buffers);
  return true;
};

Parser.prototype._combineLongPacketBuffers = function _combineLongPacketBuffers() {
  if (!this._longPacketBuffers.size) {
    return;
  }

  // Calculate bytes
  var remainingBytes      = this._buffer.length - this._offset;
  var trailingPacketBytes = this._buffer.length - this._packetEnd;

  // Create buffer
  var buf    = null;
  var buffer = Buffer.allocUnsafe(remainingBytes + this._longPacketBuffers.size);
  var offset = 0;

  // Copy long buffers
  while ((buf = this._longPacketBuffers.shift())) {
    offset += buf.copy(buffer, offset);
  }

  // Copy remaining bytes
  this._buffer.copy(buffer, offset, this._offset);

  this._buffer       = buffer;
  this._offset       = 0;
  this._packetEnd    = this._buffer.length - trailingPacketBytes;
  this._packetOffset = 0;
};

Parser.prototype._advanceToNextPacket = function() {
  this._offset       = this._packetEnd;
  this._packetHeader = null;
  this._packetEnd    = null;
  this._packetOffset = null;
};
