var PacketHeader = require('./PacketHeader');

module.exports = Parser;
function Parser(options) {
  this.onPacket = options.onPacket || this.onPacket;

  this._buffer       = null;
  this._offset       = 0;
  this._packetEnd    = null;
  this._packetHeader = null;
}

Parser.prototype.write = function(buffer) {
  this._append(buffer);

  while (true) {
    if (!this._packetHeader) {
      if (this._bytesRemaining() < 4) {
        break;
      }

      this._packetHeader = new PacketHeader(
        this.parseUnsignedNumber(3),
        this.parseUnsignedNumber(1)
      );
    }

    if (this._bytesRemaining() < this._packetHeader.length) {
      break;
    }

    this._packetEnd = this._offset + this._packetHeader.length;

    this.onPacket(this._packetHeader);

    this._offset       = this._packetEnd;
    this._packetHeader = null;
    this._packetEnd    = null;
  }
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

Parser.prototype.parseLengthCodedNumber = function() {
  var byte = this._buffer[this._offset++];

  if (byte <= 251) {
    return (byte === 251)
      ? null
      : byte;
  }

  if (byte === 252) {
    var length = 2;
  } else {
    throw new Error('not implemented');
  }

  var value = 0;
  for (var bytesRead = 0; bytesRead < length; bytesRead++) {
    var byte = this._buffer[this._offset++];
    value += Math.pow(256, bytesRead) * byte;
  }

  return value;
};

Parser.prototype.parseFiller = function(length) {
  return this.parseBuffer(length);
};

Parser.prototype.parseNullTerminated = function(encoding) {
  var end = this._offset;
  while (this._buffer[end] !== 0x00) {
    end++;
  }

  var value = (encoding)
    ? this._buffer.toString(encoding, this._offset, end)
    : this._buffer.slice(this._offset, end - 1);

  this._offset = end + 1;
  return value;
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
  var value = this._buffer.toString('utf-8', offset, end);

  this._offset = end;
  return value;
};

Parser.prototype.onPacket = function() {
};

Parser.prototype.onError = function() {
};

Parser.prototype._bytesRemaining = function() {
  return this._buffer.length - this._offset;
};

Parser.prototype.reachedPacketEnd = function() {
  return this._offset === this._packetEnd;
};

Parser.prototype._append = function(newBuffer) {
  var oldBuffer = this._buffer;
  if (!oldBuffer) {
    this._buffer = newBuffer;
    return;
  }

  var bytesRemaining = this._bytesRemaining();
  var newLength = bytesRemaining + newBuffer.length;

  var combinedBuffer = (newLength < this._offset)
    ? oldBuffer.slice(0, newLength)
    : new Buffer(newLength);

  oldBuffer.copy(combinedBuffer, 0, this._offset);
  newBuffer.copy(combinedBuffer, bytesRemaining);

  this._buffer = combinedBuffer;
  this._offset = 0;
};


Parser.FIELD_TYPE_DECIMAL     = 0x00;
Parser.FIELD_TYPE_TINY        = 0x01;
Parser.FIELD_TYPE_SHORT       = 0x02;
Parser.FIELD_TYPE_LONG        = 0x03;
Parser.FIELD_TYPE_FLOAT       = 0x04;
Parser.FIELD_TYPE_DOUBLE      = 0x05;
Parser.FIELD_TYPE_NULL        = 0x06;
Parser.FIELD_TYPE_TIMESTAMP   = 0x07;
Parser.FIELD_TYPE_LONGLONG    = 0x08;
Parser.FIELD_TYPE_INT24       = 0x09;
Parser.FIELD_TYPE_DATE        = 0x0a;
Parser.FIELD_TYPE_TIME        = 0x0b;
Parser.FIELD_TYPE_DATETIME    = 0x0c;
Parser.FIELD_TYPE_YEAR        = 0x0d;
Parser.FIELD_TYPE_NEWDATE     = 0x0e;
Parser.FIELD_TYPE_VARCHAR     = 0x0f;
Parser.FIELD_TYPE_BIT         = 0x10;
Parser.FIELD_TYPE_NEWDECIMAL  = 0xf6;
Parser.FIELD_TYPE_ENUM        = 0xf7;
Parser.FIELD_TYPE_SET         = 0xf8;
Parser.FIELD_TYPE_TINY_BLOB   = 0xf9;
Parser.FIELD_TYPE_MEDIUM_BLOB = 0xfa;
Parser.FIELD_TYPE_LONG_BLOB   = 0xfb;
Parser.FIELD_TYPE_BLOB        = 0xfc;
Parser.FIELD_TYPE_VAR_STRING  = 0xfd;
Parser.FIELD_TYPE_STRING      = 0xfe;
Parser.FIELD_TYPE_GEOMETRY    = 0xff;
