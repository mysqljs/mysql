var Sequence = require('./Sequence');
var Util     = require('util');
var Packets  = require('../packets');

module.exports = Statement;
Util.inherits(Statement, Sequence);
function Statement(options, protocol, callback) {
  Sequence.call(this, callback);

  this.sql       = options.sql;
  this._protocol = protocol;
  this._okPacket = undefined;
  this._params   = [];
  this._columns  = [];
  this._eofs     = [];
}

Statement.prototype.start = function() {
  this.emit('packet', new Packets.ComStmtPreparePacket(this.sql));
};

Statement.prototype.determinePacket = function(firstByte, parser) {
  if (firstByte === 0) {
    return Packets.StmtPrepareOkPacket;
  }

  // see Query sequence for explanation
  if (firstByte === 0xfe && parser.packetLength() < 9) {
    return Packets.EofPacket;
  }

  if (this._okPacket) {
    return Packets.FieldPacket;
  }

  return;
}

Statement.prototype['StmtPrepareOkPacket'] = function(packet) {
  this._okPacket = packet;
};

Statement.prototype['FieldPacket'] = function(packet) {
  if (this._eofs.length === 0) {
    this._params.push(packet);
  } else if (this._eofs.length === 1) {
    this._columns.push(packet);
  } else {
    throw new Error('assert: only 2 EOF packets expected');
  }
};

Statement.prototype['EofPacket'] = function(packet) {
  this._eofs.push(packet);
  if (this._eofs.length < 2) {
    return
  } else if (this._eofs.length > 2) {
    throw new Error('assert: only 2 EOF packets expected');
  }

  this.end(null);
};

Statement.prototype.execute = function(args, cb) {
  return this._protocol.executeStatement({
    statement : this,
    args      : args,
  }, cb);
};
