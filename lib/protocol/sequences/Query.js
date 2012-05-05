var Sequence = require('./Sequence');
var Util     = require('util');
var Packets  = require('../packets');

module.exports = Query;
Util.inherits(Query, Sequence);
function Query(options, callback) {
  Sequence.call(this, callback);

  this._sql = options.sql;

  this._resultSetHeaderPacket = null;
  this._fieldPackets          = [];
  this._eofPackets            = [];
  this._rows                  = [];
}

Query.prototype.start = function() {
  this._emitPacket(new Packets.ComQueryPacket(this._sql));
};

Query.prototype.determinePacket = function(firstByte) {
  if (firstByte < 1 || firstByte > 250) {
    return;
  }

  if (!this._resultSetHeaderPacket) {
    return Packets.ResultSetHeaderPacket;
  }

  return (this._eofPackets.length === 0)
    ? Packets.FieldPacket
    : Packets.RowDataPacket;
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
    this.end(null, this._rows);
  }
};

Query.prototype['RowDataPacket'] = function(packet, parser) {
  packet.parse(parser, this._fieldPackets);

  if (this._callback) {
    this._rows.push(packet);
  } else {
    this.emit('row', packet);
  }
};
