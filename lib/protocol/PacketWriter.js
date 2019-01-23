var BIT_16                          = Math.pow(2, 16);
var BIT_24                          = Math.pow(2, 24);
var BUFFER_ALLOC_SIZE               = Math.pow(2, 8);
var COMPRESSED_PACKET_HEADER_LENGTH = 7;
// The maximum precision JS Numbers can hold precisely
// Don't panic: Good enough to represent byte values up to 8192 TB
var IEEE_754_BINARY_64_PRECISION = Math.pow(2, 53);
var PACKET_HEADER_LENGTH         = 4;
var MAX_PACKET_LENGTH            = Math.pow(2, 24) - 1;

var Buffer       = require('safe-buffer').Buffer;
var BufferList   = require('./BufferList');
var EventEmitter = require('events').EventEmitter;
var Util         = require('util');
var Zlib         = require('zlib');

module.exports = PacketWriter;
function PacketWriter() {
  this._buffer       = null;
  this._deflateQueue = [];
  this._deflating    = false;
  this._offset       = 0;
  this._sync         = false;
}
Util.inherits(PacketWriter, EventEmitter);

PacketWriter.prototype.finalize = function finalize(parser) {
  if (!this._buffer) {
    this._buffer = Buffer.alloc(0);
    this._offset = 0;
  }

  var maxPacketLength = parser._compressed
    ? MAX_PACKET_LENGTH - PACKET_HEADER_LENGTH
    : MAX_PACKET_LENGTH;

  var buffer  = this._buffer;
  var length  = this._offset;
  var packets = Math.floor(length / maxPacketLength) + 1;

  for (var packet = 0; packet < packets; packet++) {
    var isLast = (packet + 1 === packets);
    var packetLength = (isLast)
      ? length % maxPacketLength
      : maxPacketLength;

    var num   = parser.incrementPacketNumber();
    var start = packet * maxPacketLength;
    var end   = start + packetLength;
    var buf   = this._toPacket(num, buffer.slice(start, end));

    if (parser._compressed) {
      num = parser.incrementCompressedPacketNumber();

      if (this._sync) {
        buf = this._toCompressedPacket(num, buf);
      } else {
        this._toCompressedPacketAsync(num, buf);
        buf = null;
      }
    }

    if (buf) {
      this.emit('data', buf);
    }
  }
};

PacketWriter.prototype.toBuffer = function toBuffer(parser) {
  var bufs = new BufferList();

  this.on('data', function (data) {
    bufs.push(data);
  });

  this._sync = true;
  this.finalize(parser);

  this._buffer = Buffer.allocUnsafe(bufs.size);
  this._offset = 0;

  while (bufs.size > 0) {
    this._offset += bufs.shift().copy(this._buffer, this._offset);
  }

  return this._buffer;
};

PacketWriter.prototype.writeUnsignedNumber = function(bytes, value) {
  this._allocate(bytes);

  for (var i = 0; i < bytes; i++) {
    this._buffer[this._offset++] = (value >> (i * 8)) & 0xff;
  }
};

PacketWriter.prototype.writeFiller = function(bytes) {
  this._allocate(bytes);

  for (var i = 0; i < bytes; i++) {
    this._buffer[this._offset++] = 0x00;
  }
};

PacketWriter.prototype.writeNullTerminatedString = function(value, encoding) {
  // Typecast undefined into '' and numbers into strings
  value = value || '';
  value = value + '';

  var bytes = Buffer.byteLength(value, encoding || 'utf-8') + 1;
  this._allocate(bytes);

  this._buffer.write(value, this._offset, encoding);
  this._buffer[this._offset + bytes - 1] = 0x00;

  this._offset += bytes;
};

PacketWriter.prototype.writeString = function(value) {
  // Typecast undefined into '' and numbers into strings
  value = value || '';
  value = value + '';

  var bytes = Buffer.byteLength(value, 'utf-8');
  this._allocate(bytes);

  this._buffer.write(value, this._offset, 'utf-8');

  this._offset += bytes;
};

PacketWriter.prototype.writeBuffer = function(value) {
  var bytes = value.length;

  this._allocate(bytes);
  value.copy(this._buffer, this._offset);
  this._offset += bytes;
};

PacketWriter.prototype.writeLengthCodedNumber = function(value) {
  if (value === null) {
    this._allocate(1);
    this._buffer[this._offset++] = 251;
    return;
  }

  if (value <= 250) {
    this._allocate(1);
    this._buffer[this._offset++] = value;
    return;
  }

  if (value > IEEE_754_BINARY_64_PRECISION) {
    throw new Error(
      'writeLengthCodedNumber: JS precision range exceeded, your ' +
      'number is > 53 bit: "' + value + '"'
    );
  }

  if (value < BIT_16) {
    this._allocate(3);
    this._buffer[this._offset++] = 252;
  } else if (value < BIT_24) {
    this._allocate(4);
    this._buffer[this._offset++] = 253;
  } else {
    this._allocate(9);
    this._buffer[this._offset++] = 254;
  }

  // 16 Bit
  this._buffer[this._offset++] = value & 0xff;
  this._buffer[this._offset++] = (value >> 8) & 0xff;

  if (value < BIT_16) {
    return;
  }

  // 24 Bit
  this._buffer[this._offset++] = (value >> 16) & 0xff;

  if (value < BIT_24) {
    return;
  }

  this._buffer[this._offset++] = (value >> 24) & 0xff;

  // Hack: Get the most significant 32 bit (JS bitwise operators are 32 bit)
  value = value.toString(2);
  value = value.substr(0, value.length - 32);
  value = parseInt(value, 2);

  this._buffer[this._offset++] = value & 0xff;
  this._buffer[this._offset++] = (value >> 8) & 0xff;
  this._buffer[this._offset++] = (value >> 16) & 0xff;

  // Set last byte to 0, as we can only support 53 bits in JS (see above)
  this._buffer[this._offset++] = 0;
};

PacketWriter.prototype.writeLengthCodedBuffer = function(value) {
  var bytes = value.length;
  this.writeLengthCodedNumber(bytes);
  this.writeBuffer(value);
};

PacketWriter.prototype.writeNullTerminatedBuffer = function(value) {
  this.writeBuffer(value);
  this.writeFiller(1); // 0x00 terminator
};

PacketWriter.prototype.writeLengthCodedString = function(value) {
  if (value === null) {
    this.writeLengthCodedNumber(null);
    return;
  }

  value = (value === undefined)
    ? ''
    : String(value);

  var bytes = Buffer.byteLength(value, 'utf-8');
  this.writeLengthCodedNumber(bytes);

  if (!bytes) {
    return;
  }

  this._allocate(bytes);
  this._buffer.write(value, this._offset, 'utf-8');
  this._offset += bytes;
};

PacketWriter.prototype._allocate = function _allocate(bytes) {
  if (!this._buffer) {
    this._buffer = Buffer.alloc(Math.max(BUFFER_ALLOC_SIZE, bytes));
    this._offset = 0;
    return;
  }

  var bytesRemaining = this._buffer.length - this._offset;
  if (bytesRemaining >= bytes) {
    return;
  }

  var newSize   = this._buffer.length + Math.max(BUFFER_ALLOC_SIZE, bytes);
  var oldBuffer = this._buffer;

  this._buffer = Buffer.alloc(newSize);
  oldBuffer.copy(this._buffer);
};

PacketWriter.prototype._deflateNextPacket = function _deflateNextPacket() {
  if (this._deflating) {
    return;
  }

  var item = this._deflateQueue.shift();
  var buf  = item[1];
  var num  = item[0];
  var len  = buf.length;
  var self = this;

  this._deflating = true;
  Zlib.deflate(buf, function (err, data) {
    if (err) {
      self.emit('error', err);
      return;
    }

    self._deflating = false;
    self.emit('data', self._toCompressedPacket(num, data, len));
    self._deflateNextPacket();
  });
};

PacketWriter.prototype._toCompressedPacket = function _toCompressedPacket(num, buf, len) {
  var origBuffer = this._buffer;
  var origOffset = this._offset;

  this._buffer = Buffer.allocUnsafe(buf.length + COMPRESSED_PACKET_HEADER_LENGTH);
  this._offset = 0;

  this.writeUnsignedNumber(3, buf.length);
  this.writeUnsignedNumber(1, num);
  this.writeUnsignedNumber(3, (len || 0));
  this.writeBuffer(buf);

  var packet = this._buffer;

  this._buffer = origBuffer;
  this._offset = origOffset;

  return packet;
};

PacketWriter.prototype._toCompressedPacketAsync = function _toCompressedPacketAsync(num, buf) {
  this._deflateQueue.push(buf);
  this._deflateNextPacket();
};

PacketWriter.prototype._toPacket = function _toPacket(num, buf) {
  var origBuffer = this._buffer;
  var origOffset = this._offset;

  this._buffer = Buffer.allocUnsafe(buf.length + PACKET_HEADER_LENGTH);
  this._offset = 0;

  this.writeUnsignedNumber(3, buf.length);
  this.writeUnsignedNumber(1, num);
  this.writeBuffer(buf);

  var packet = this._buffer;

  this._buffer = origBuffer;
  this._offset = origOffset;

  return packet;
};
