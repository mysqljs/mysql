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

  this._resultSet = null;
  this._results   = [];
  this._index     = 0;
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

  if (!this._resultSet) {
    return Packets.ResultSetHeaderPacket;
  }

  return (this._resultSet.eofPackets.length === 0)
    ? Packets.FieldPacket
    : Packets.RowDataPacket;
};

Query.prototype['OkPacket'] = function(packet) {
  if (!this._callback) {
    this.emit('result', packet, this._index);
  } else {
    this._results.push(packet);
  }

  this._index++;
  this._handleFinalResultPacket(packet);
};

Query.prototype['ErrorPacket'] = function(packet) {
  var err = Sequence.packetToError(packet);

  var results = (this._results.length > 0)
    ? this._results
    : undefined;

  err.index = this._index;
  this.end(err, results);
};

Query.prototype['ResultSetHeaderPacket'] = function(packet) {
  this._resultSet = new ResultSet(packet);
};

Query.prototype['FieldPacket'] = function(packet) {
  this._resultSet.fieldPackets.push(packet);
};

Query.prototype['EofPacket'] = function(packet) {
  this._resultSet.eofPackets.push(packet);

  if (this._resultSet.eofPackets.length !== 2) {
    return;
  }

  if (this._callback) {
    this._results.push(this._resultSet.rows);
  }

  this._index++;
  this._resultSet = null;
  this._handleFinalResultPacket(packet);
};

Query.prototype._handleFinalResultPacket = function(packet) {
  if (packet.serverStatus & ServerStatus.SERVER_MORE_RESULTS_EXISTS) {
    return;
  }

  var results = (this._results.length > 1)
    ? this._results
    : this._results[0];

  this.end(null, results);
};

Query.prototype['RowDataPacket'] = function(packet, parser) {
  packet.parse(parser, this._resultSet.fieldPackets, this.typeCast);

  if (this._callback) {
    this._resultSet.rows.push(packet);
  } else {
    // @TODO Multiple results
    this.emit('result', packet, this._index);
  }
};
