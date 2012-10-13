var Types    = require('../constants/types');
var Charsets = require('../constants/charsets');

module.exports = RowDataPacket;
function RowDataPacket() {
}

RowDataPacket.prototype.parse = function(parser, fieldPackets, typeCast, nestTables) {
  for (var i = 0; i < fieldPackets.length; i++) {
    var fieldPacket = fieldPackets[i];

    var value = (typeCast)
      ? this._typeCast(fieldPacket, parser)
      : ( (fieldPacket.charsetNr === Charsets.BINARY)
        ? parser.parseLengthCodedBuffer()
        : parser.parseLengthCodedString() );

    if (nestTables) {
      this[fieldPacket.table] = this[fieldPacket.table] || {};
      this[fieldPacket.table][fieldPacket.name] = value;
    } else {
      this[fieldPacket.name] = value;
    }
  }
};

RowDataPacket.prototype._typeCast = function(field, parser) {
  switch (field.type) {
    case Types.TIMESTAMP:
    case Types.DATE:
    case Types.DATETIME:
    case Types.NEWDATE:
      var dateString = parser.parseLengthCodedString();
      if (dateString === null) {
        return null;
      }

      // Otherwise JS will assume the string to be in GMT rather than local
      // time which is not what we want here. We always try to treat date
      // objects and strings as if they were in local time.
      if (field.type === Types.DATE) {
        dateString += ' 00:00:00';
      }

      return new Date(dateString);
    case Types.TINY:
    case Types.SHORT:
    case Types.LONG:
    case Types.INT24:
    case Types.YEAR:
    case Types.FLOAT:
    case Types.DOUBLE:
      var numberString = parser.parseLengthCodedString();
      return (numberString === null)
        ? numberString
        : Number(numberString);
    case Types.BIT:
      return parser.parseLengthCodedBuffer();
    case Types.STRING:
    case Types.VAR_STRING:
    case Types.TINY_BLOB:
    case Types.MEDIUM_BLOB:
    case Types.LONG_BLOB:
    case Types.BLOB:
      return (field.charsetNr === Charsets.BINARY)
        ? parser.parseLengthCodedBuffer()
        : parser.parseLengthCodedString();
    case Types.GEOMETRY:
      var buffer = parser.parseLengthCodedBuffer();
      var offset = 4;
      function parseGeometry() {
        var result = null;
        var byteOrder = buffer.readUInt8(offset); offset += 1;
        var wkbType = byteOrder? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset); offset += 4;
        switch(wkbType) {
          case 1: // WKBPoint
            var x = byteOrder? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset); offset += 8;
            var y = byteOrder? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset); offset += 8;
            result = {x: x, y: y};
            break;
          case 2: // WKBLineString
            var numPoints = byteOrder? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset); offset += 4;
            result = [];
            for(var i=numPoints;i>0;i--) {
              var x = byteOrder? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset); offset += 8;
              var y = byteOrder? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset); offset += 8;
              result.push({x: x, y: y});
            }
            break;
          case 3: // WKBPolygon
            var numRings = byteOrder? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset); offset += 4;
            result = [];
            for(var i=numRings;i>0;i--) {
              var numPoints = byteOrder? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset); offset += 4;
              var line = [];
              for(var j=numPoints;j>0;j--) {
                var x = byteOrder? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset); offset += 8;
                var y = byteOrder? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset); offset += 8;
                line.push({x: x, y: y});
              }
              result.push(line);
            }
            break;
          case 4: // WKBMultiPoint
          case 5: // WKBMultiLineString
          case 6: // WKBMultiPolygon
          case 7: // WKBGeometryCollection
            var num = byteOrder? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset); offset += 4;
            var result = [];
            for(var i=num;i>0;i--) {
              result.push(parseGeometry());
            }
            break;
        }
        return result;
      }
      return parseGeometry();
    default:
      return parser.parseLengthCodedString();
  }
};
