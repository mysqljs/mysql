var Packets      = require('../packets');
var EventEmitter = require('events').EventEmitter;
var Util         = require('util');

module.exports = Query;
Util.inherits(Query, EventEmitter);
function Query(options, callback) {
  EventEmitter.call(this);

  this._sql          = options.sql;
  this._callback     = callback;
  this._fieldPackets = [];
  this._rows         = [];
  this._eofCount     = 0;
}

Query.prototype.handlePacket = function(packet) {
  if (packet instanceof Packets.RowDataPacket) {
    if (this._callback) {
      this._rows.push(packet);
    } else {
      this.emit('row', packet);
    }

    return;
  }

  if (packet instanceof Packets.OkPacket) {
    this._finish(null);
    return;
  }

  if (packet instanceof Packets.ErrorPacket) {
    this._finish(new Error(packet.message));
    return;
  }

  if (packet instanceof Packets.FieldPacket) {
    this._fieldPackets.push(packet);
    return;
  }


  if (packet instanceof Packets.EofPacket) {
    this._eofCount++;

    if (this._eofCount === 2) {
      this._finish(null, this._rows);
    }
  }
};

Query.prototype._finish = function(err, result) {
  if (this._callback) {
    this._callback(err, result);
  } else if (err) {
    this.emit('error', err);
  }

  this.emit('end');
};
