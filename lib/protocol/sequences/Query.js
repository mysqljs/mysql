var Sequence = require('./Sequence');
var Util     = require('util');
var Packets  = require('../packets');

module.exports = Query;
Util.inherits(Query, Sequence);
function Query(options, callback) {
  Sequence.call(this, callback);

  this._sql = options.sql;
  this._typeCast = (options.typeCast === undefined)
    ? true
    : options.typeCast;


  this._resultSetHeaderPacket = null;
  this._fieldPackets          = [];
  this._eofPackets            = [];
  this._rows                  = [];
}

Query.prototype.start = function() {
  this._emitPacket(new Packets.ComQueryPacket(this._sql));
};

Query.prototype.determinePacket = function(firstByte, header) {
  if (firstByte === 0 || firstByte === 255) {
    return;
  }

  // EofPacket's are 5 bytes in mysql >= 4.1
  // This is the only / best way to differentiate their firstByte from a 9
  // byte length coded binary.
  if (firstByte === 0xfe && header.length < 9) {
    return Packets.EofPacket;
  }

  if (!this._resultSetHeaderPacket) {
    return Packets.ResultSetHeaderPacket;
  }

  return (this._eofPackets.length === 0)
    ? Packets.FieldPacket
    : Packets.RowDataPacket;
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
    this.end(null, this._rows);
  }
};

Query.prototype['RowDataPacket'] = function(packet, parser) {
  packet.parse(parser, this._fieldPackets, this._typeCast);

  if (this._callback) {
    this._rows.push(packet);
  } else {
    this.emit('row', packet);
  }
};
