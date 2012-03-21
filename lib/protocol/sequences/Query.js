var Util     = require('util');
var Packets  = require('../packets');
var Sequence = require('./Sequence');
var Async    = require('../../Async');

module.exports = Query;
Util.inherits(Query, Sequence);
function Query(properties) {
  Sequence.call(this, properties);

  this.sql  = properties.sql;
  this.rows = [];

  this._resultSetHeaderPacket = null;
  this._fieldPackets          = [];
  this._eofPackets            = [];
}

Query.prototype.execute = function(cb) {
  var self = this;

  Async.waterfall([
    this._sendQuery.bind(this),
    this._handlePacket.bind(this),
  ], cb);
};

Query.prototype._sendQuery = function(cb) {
  this.emit('packet', new Packets.ComQueryPacket({
    sql: this.sql,
  }));

  this._parser.push(new Packets.ResultPacket, cb);
};

Query.prototype._handlePacket = function(packet, cb) {
  this['_handle' + packet.constructor.name](packet, cb);
};

Query.prototype._handleResultSetHeaderPacket = function(packet, cb) {
  this._resultSetHeaderPacket = packet;

  this._expect(Packets.FieldPacket, cb);
};

Query.prototype._handleFieldPacket = function(packet, cb) {
  this._fieldPackets.push(packet);

  this._expect(Packets.FieldPacket, cb);
};

Query.prototype._handleRowDataPacket = function(packet, cb) {
  var row = {};

  for (var column in packet.columns) {
    var value = packet.columns[column].value;
    row[column] = value;
  }

  this.rows.push(row);

  this._expect(Packets.RowDataPacket, cb);
};

Query.prototype._handleEofPacket = function(packet, cb) {
  this._eofPackets.push(packet);

  if (this._eofPackets.length === 1) {
    this._expect(Packets.RowDataPacket, cb);
    return;
  }

  cb(null, this.rows);
};

Query.prototype._expect = function(Packet, cb) {
  var self = this;

  var packet = new Packets.ResultPacket({
    ambiguousPacket: Packet,
    ambiguousOptions: {fieldPackets: this._fieldPackets},
  });

  this._parser.push(packet, function(err, result) {
    if (err) {
      return cb(err);
    }

    self._handlePacket(result, cb);
  });
};

