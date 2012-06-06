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
      : parser.parseLengthCodedString();

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
      return (dateString === null)
        ? dateString
        : new Date(dateString);
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
    default:
      return parser.parseLengthCodedString();
  }
};
