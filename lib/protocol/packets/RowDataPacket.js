var Types    = require('../constants/types');
var Charsets = require('../constants/charsets');

module.exports = RowDataPacket;
function RowDataPacket() {
}

RowDataPacket.prototype.parse = function(parser, fieldPackets, typeCast, nestTables, timeZone) {
  var self = this;

  for (var i = 0; i < fieldPackets.length; i++) {
    var fieldPacket = fieldPackets[i];
    var value;

    if (typeof typeCast == "function") {
      value = typeCast(fieldPacket, parser, timeZone, function () {
        return self._typeCast(fieldPacket, parser, timeZone);
      });
    } else {
      value = (typeCast)
        ? this._typeCast(fieldPacket, parser, timeZone)
        : ( (fieldPacket.charsetNr === Charsets.BINARY)
          ? parser.parseLengthCodedBuffer()
          : parser.parseLengthCodedString() );
    }

    if (typeof nestTables == "string" && nestTables.length) {
      this[fieldPacket.table + nestTables + fieldPacket.name] = value;
    } else if (nestTables) {
      this[fieldPacket.table] = this[fieldPacket.table] || {};
      this[fieldPacket.table][fieldPacket.name] = value;
    } else {
      this[fieldPacket.name] = value;
    }
  }
};

RowDataPacket.prototype._typeCast = function(field, parser, timeZone) {
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
      } else if (timeZone != 'local') {
        // no timezone for date columns, there's no time.. so there's no time..zone
        dateString += timeZone;
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
      return (numberString === null || (field.zeroFill && numberString[0] == "0"))
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
      return parser.parseGeometryValue();
    default:
      return parser.parseLengthCodedString();
  }
};
