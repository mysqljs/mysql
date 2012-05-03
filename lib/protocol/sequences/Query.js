var Sequence = require('./Sequence');
var Util     = require('util');
var Packets  = require('../packets');

module.exports = Query;
Util.inherits(Query, Sequence);
function Query(parser, callback, options) {
  Sequence.call(this, parser, callback, options);

  this._resultSetHeaderPacket = null;
  this._fieldPackets          = [];
  this._eofPackets            = [];
  this._rows                  = [];
}

Query.prototype.start = function() {
  this._emitPacket(new Packets.ComQueryPacket(this._options.sql));
};

Query.prototype._determinePacket = function() {
  var byte = this._parser.peak();
  if (byte >= 1 && byte <= 250) {
    if (!this._resultSetHeaderPacket) {
      return Packets.ResultSetHeaderPacket;
    }

    return (this._eofPackets.length === 0)
      ? Packets.FieldPacket
      : Packets.RowDataPacket;
  }

  return Sequence.determinePacket(byte);
};

Query.prototype._parse = function(packet) {
  if (packet.constructor === Packets.RowDataPacket) {
    packet.parse(this._parser, this._fieldPackets);
  } else {
    packet.parse(this._parser);
  }
};

Query.prototype['ResultSetHeaderPacket'] = function(packet) {
  this._resultSetHeaderPacket = packet;
};

Query.prototype['FieldPacket'] = function(packet) {
  this._fieldPackets.push(packet);
};

Query.prototype['EofPacket'] = function(packet) {
  this._eofPackets.push(packet);

  if (this._eofPackets.length === 2) {
    this._end(null, this._rows);
  }
};

Query.prototype['RowDataPacket'] = function(packet) {
  if (this._callback) {
    this._rows.push(packet);
  } else {
    this.emit('row', packet);
  }
};
