var Util     = require('util');
var Packets  = require('../packets');
var Sequence = require('./Sequence');
var Async    = require('../../Async');

module.exports = Query;
Util.inherits(Query, Sequence);
function Query(properties) {
  Sequence.call(this, properties);

  this.sql = properties.sql;
}

Query.prototype.execute = function(cb) {
  var self = this;

  Async.waterfall([
    this._sendQuery.bind(this),
    this._handleResultPacket.bind(this),
    this._handleFieldPacket.bind(this),
  ], cb);
};

Query.prototype._sendQuery = function(cb) {
  this.emit('packet', new Packets.ComQueryPacket({
    sql: this.sql,
  }));

  this._parser.push(new Packets.ResultPacket, cb);
};

Query.prototype._handleResultPacket = function(packet, cb) {
  if (packet instanceof Packets.ResultSetHeaderPacket) {
    this._parser.push(new Packets.FieldPacket(), cb);
    return;
  }

  throw new Error('Query.UnexpectedPacket: ' + Util.inspect(Packet));
};

Query.prototype._handleFieldPacket = function(packet) {
  console.log(packet);
};
