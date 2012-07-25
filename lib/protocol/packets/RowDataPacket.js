var Types    = require('../constants/types');
var Charsets = require('../constants/charsets');

module.exports = RowDataPacket;
function RowDataPacket() {
}

RowDataPacket.prototype.parse = function(parser, fieldPackets, castMap, nestTables) {
  // if we have got the cast map supplied - we will call casting method
  var shouldCast = (typeof castMap === 'object'); 


  for (var i = 0; i < fieldPackets.length; i++) {
    var fieldPacket = fieldPackets[i];

    var value;
    if (shouldCast) {
      value = this._cast(fieldPacket, parser, castMap);
    } else {
      // no casting map was passed so we return the string value
      value = parser.parseLengthCodedString();
    }

    if (nestTables) {
      this[fieldPacket.table] = this[fieldPacket.table] || {};
      this[fieldPacket.table][fieldPacket.name] = value;
    } else {
      this[fieldPacket.name] = value;
    }
  }
};


RowDataPacket.prototype._cast = function(field, parser, castMap) {
  var jsType;
  if (field.type in castMap) {
    jsType = castMap[field.type];
  } else { 
    jsType = Types.JS_STRING;
  }

  switch (jsType) {
    case Types.JS_DATE:
      var dateString = parser.parseLengthCodedString();
      if (dateString === null) {
        return null;
      }

      // Otherwise JS will assume the string to be in GMT rather than local
      // time which is not what we want here. We always try to treat date
      // objects and strings as if they were in local time.
      if (field.type === Types.MYSQL_DATE) {
        dateString += ' 00:00:00';
      }

      return new Date(dateString);
    case Types.JS_NUMBER:
      var numberString = parser.parseLengthCodedString();
      return (numberString === null)
        ? numberString
        : Number(numberString);
    case Types.JS_BUFFER: 
      return parser.parseLengthCodedBuffer();
    case Types.JS_BUFFER_OR_STRING:
      return (field.charsetNr === Charsets.BINARY)
        ? parser.parseLengthCodedBuffer()
        : parser.parseLengthCodedString();
    case Types.JS_STRING: 
    default:
      return parser.parseLengthCodedString();
  }
};
