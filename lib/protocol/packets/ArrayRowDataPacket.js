var Charsets                     = require('../constants/charsets');
var RowDataPacket                = require('./RowDataPacket');
var Field                        = require('./Field');

module.exports = ArrayRowDataPacket;
function ArrayRowDataPacket() {
}

Object.defineProperty(ArrayRowDataPacket.prototype, 'parse', {
  configurable : true,
  enumerable   : false,
  value        : parse
});

Object.defineProperty(ArrayRowDataPacket.prototype, '_typeCast', {
  configurable : true,
  enumerable   : false,
  value        : RowDataPacket.prototype._typeCast
});

function parse(parser, fieldPackets, typeCast, nestTables, connection) {
  var self = this;
  var next = function () {
    return self._typeCast(fieldPacket, parser, connection.config.timezone, connection.config.supportBigNumbers, connection.config.bigNumberStrings, connection.config.dateStrings);
  };
  this.values = [];

  for (var i = 0; i < fieldPackets.length; i++) {
    var fieldPacket = fieldPackets[i];
    var value;

    if (typeof typeCast === 'function') {
      value = typeCast.apply(connection, [ new Field({ packet: fieldPacket, parser: parser }), next ]);
    } else {
      value = (typeCast)
        ? this._typeCast(fieldPacket, parser, connection.config.timezone, connection.config.supportBigNumbers, connection.config.bigNumberStrings, connection.config.dateStrings)
        : ( (fieldPacket.charsetNr === Charsets.BINARY)
          ? parser.parseLengthCodedBuffer()
          : parser.parseLengthCodedString() );
    }
    this.values[i] = value;
  }
}
