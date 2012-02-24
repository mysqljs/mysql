var Util     = require('util');
var Packets  = require('../packets');
var Sequence = require('./Sequence');

module.exports = Query;
Util.inherits(Query, Sequence);
function Query(properties) {
  Sequence.call(this);

  this.sql = properties.sql;
}

Query.prototype.start = function() {
  var comQuery = new Packets.ComQueryPacket({
    sql: this.sql,
  });

  this.emit('packet', comQuery);

  this.expect(new Packets.ResultPacket);
};

Query.prototype.handle = function(packet) {
  if (packet.constructor === Packets.ResultPacket) {
    var type = packet.type();
    if (!Packets[type]) throw new Error('Handshake.NotImplemented: ' + type);

    // @TODO I hate this, it seems very in-efficent and unelegant
    this.expect(packet.copy(new Packets[type]));
    return;
  }

  if (packet instanceof Packets.ErrorPacket) {
    throw new Error('Query.Error: ' + packet.message.value);
    return;
  }

  throw new Error('Handshake.UnexpectedPacket: ' + Util.inspect(packet));
};
