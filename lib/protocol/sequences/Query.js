var Sequence     = require('./Sequence');
var Util         = require('util');
var Packets      = require('../packets');
var ResultSet    = require('../ResultSet');
var ServerStatus = require('../constants/server_status');

module.exports = Query;
Util.inherits(Query, Sequence);
function Query(options, callback) {
  Sequence.call(this, callback);

  this.sql = options.sql;
  this.typeCast = (options.typeCast === undefined)
    ? true
    : options.typeCast;

  this._resultSet  = new ResultSet;
  this._resultSets = [];
}

Query.prototype.start = function() {
  this._emitPacket(new Packets.ComQueryPacket(this.sql));
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

  if (!this._resultSet.resultSetHeaderPacket) {
    return Packets.ResultSetHeaderPacket;
  }

  return (this._resultSet.eofPackets.length === 0)
    ? Packets.FieldPacket
    : Packets.RowDataPacket;
};

Query.prototype['ResultSetHeaderPacket'] = function(packet) {
  this._resultSet.resultSetHeaderPacket = packet;
};

Query.prototype['FieldPacket'] = function(packet) {
  this._resultSet.fieldPackets.push(packet);
};

Query.prototype['EofPacket'] = function(packet) {
  this._resultSet.eofPackets.push(packet);

  if (this._resultSet.eofPackets.length === 2) {
    this._resultSets.push(this._resultSet);

    if (packet.serverStatus & ServerStatus.SERVER_MORE_RESULTS_EXISTS) {
      this._resultSet = new ResultSet();
    } else {
      this._resultSet = null;
      this.end(null, this._results());
    }
  }
};

Query.prototype._results = function() {
  var results = this._resultSets.map(function(resultSet) {
    return resultSet.rows;
  });

  return (results.length > 1)
    ? results
    : results[0];
};

Query.prototype['RowDataPacket'] = function(packet, parser) {
  packet.parse(parser, this._resultSet.fieldPackets, this.typeCast);

  if (this._callback) {
    this._resultSet.rows.push(packet);
  } else {
    // @TODO Multiple results
    this.emit('row', packet);
  }
};
