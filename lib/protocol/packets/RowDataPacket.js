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

  switch (fieldPacket.type) {
    case Types.TIMESTAMP:
    case Types.DATE:
    case Types.DATETIME:
    case Types.NEWDATE:
      value = new Date(value);
      break;
    case Types.TINY:
    case Types.SHORT:
    case Types.LONG:
    case Types.LONGLONG:
    case Types.INT24:
    case Types.YEAR:
      value = parseInt(value, 10);
      break;
    case Types.FLOAT:
    case Types.DOUBLE:
      // decimal types cannot be parsed as floats because
      // V8 Numbers have less precision than some MySQL Decimals
      value = parseFloat(value);
      break;
  }
};
