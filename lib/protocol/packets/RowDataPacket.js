var Types      = require('../constants/types');
var FieldFlags = require('../constants/field_flags');

module.exports = RowDataPacket;
function RowDataPacket() {
}

RowDataPacket.prototype.parse = function(parser, fieldPackets, typeCast) {
  for (var i = 0; i < fieldPackets.length; i++) {
    var fieldPacket = fieldPackets[i];

    this[fieldPacket.name] = (typeCast)
      ? this._typeCast(fieldPacket, parser)
      : parser.parseLengthCodedString();
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
    case Types.BLOB:
      return (field.flags & FieldFlags.BINARY_FLAG)
        ? parser.parseLengthCodedBuffer()
        : parser.parseLengthCodedString();
    default:
      return parser.parseLengthCodedString();
  }
};
