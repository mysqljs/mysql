exports.create = function(options) {
  var buffers         = [];
  var rows            = 0;
  var number          = 0;

  var buffer;
  var rowBuffer;
  var bufferOffset;
  var rowBufferOffset;

  while (rows < options.rowCount) {
    if (!rowBuffer) {
      rowBuffer       = this.createRowBuffer(options.row, number);
      rowBufferOffset = 0;
      number++;
      if (number > 255) number = 0;
    }

    if (!buffer) {
      buffer       = new Buffer(options.bufferSize);
      bufferOffset = 0;
    }

    var rowBufferEnd = (buffer.length - bufferOffset < rowBuffer.length - rowBufferOffset)
      ? rowBufferOffset + (buffer.length - bufferOffset)
      : rowBuffer.length;

    rowBuffer.copy(buffer, bufferOffset, rowBufferOffset, rowBufferEnd);

    bufferOffset    += rowBufferEnd - rowBufferOffset;
    rowBufferOffset = rowBufferEnd;

    if (bufferOffset === buffer.length) {
      buffers.push(buffer);
      buffer = null;
    }

    if (rowBufferOffset === rowBuffer.length) {
      rowBuffer = null;
      rows++;
    }
  }

  if (bufferOffset > 0) {
    buffers.push(buffer.slice(0, bufferOffset));
  }

  return buffers;
};

exports.createRowBuffer = function(row, number) {
  var self = this;

  var columns = Object
    .keys(row)
    .map(function(columnName) {
      var column = row[columnName];
      return (typeof column === 'function')
        ? column() + ''
        : column + '';
    });

  var length = columns.reduce(function(size, column) {
    var columnLength = Buffer.byteLength(column, 'utf-8');;
    return size + self.lengthCodedBinaryLength(columnLength) + columnLength;
  }, 4);

  var buffer = new Buffer(length);

  columns.reduce(function(offset, column) {
    var columnLength = Buffer.byteLength(column, 'utf-8');
    offset = self.writeLengthCodedBinary(buffer, columnLength, offset);
    buffer.write(column, offset, 'utf-8');
    return offset + columnLength;
  }, 4);

  this.writeUnsignedInteger(buffer, length - 4, 3, 0);
  this.writeUnsignedInteger(buffer, number, 1, 3);

  return buffer;
};

exports.lengthCodedBinaryLength = function(value) {
  if (value <= 250) {
    return 1;
  } else if (value <= Math.pow(2, 16)) {
    return 3;
  } else if (value <= Math.pow(2, 24)) {
    return 4;
  } else if (value <= Math.pow(2, 64)) {
    return 9;
  }

  throw new Error('Not yet implemented');
};

exports.writeLengthCodedBinary = function(buffer, value, offset) {
  if (value <= 250) {
    buffer[offset] = value;
    return offset + 1;
  }

  if (value <= Math.pow(2, 16)) {
    buffer[offset] = 252;
    buffer[offset + 1] = value & 0xff;
    buffer[offset + 2] = (value >> 8) & 0xff;
    return offset + 3;
  }

  buffer[offset + 3] = (value >> 16) & 0xff;

  if (value <= Math.pow(2, 24)) {
    // 24 Bit Marker
    buffer[offset + 0] = 253;
    return;
  }

  throw new Error('Not yet implemented');
};

exports.writeUnsignedInteger = function(buffer, value, length, offset) {
  for (var i = 0; i < length; i++) {
    buffer[i + offset] = (value >> (i * 8)) & 0xff;
  }
};
