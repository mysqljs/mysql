var Types = require('../constants/types');

module.exports = RowDataPacket;
function RowDataPacket() {
}

RowDataPacket.prototype.parse = function(parser, fieldPackets, typeCast) {
  for (var i = 0; i < fieldPackets.length; i++) {
    var fieldPacket = fieldPackets[i];
    var value       = parser.parseLengthCodedString();

    if (typeCast) {
      value = this._typeCast(value, fieldPacket.type);
    }

    this[fieldPacket.name] = value;
  }
};

RowDataPacket.prototype._typeCast = function(value, type) {
  // This is a separate function, otherwise v8 will bail with:
  // Bailout in HGraphBuilder: @"RowDataPacket.parse": SwitchStatement: non-literal switch label

  switch (type) {
    case Types.TIMESTAMP:
    case Types.DATE:
    case Types.DATETIME:
    case Types.NEWDATE:
      return new Date(value);
    case Types.TINY:
    case Types.SHORT:
    case Types.LONG:
    case Types.INT24:
    case Types.YEAR:
    case Types.FLOAT:
    case Types.DOUBLE:
      return Number(value);
    default:
      return value;
  }
};
