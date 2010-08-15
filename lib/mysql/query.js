var sys = require('sys'),
    EventEmitter = require('events').EventEmitter,
    Parser = require('./parser');

function Query() {
  EventEmitter.call(this);
}
sys.inherits(Query, EventEmitter);
module.exports = Query;

Query.prototype._handlePacket = function(packet) {
  if (packet.type == Parser.OK_PACKET) {
    this.emit('end', packet);
    return;
  }

  if (packet.type == Parser.ERROR_PACKET) {
    this.emit('error', packet);
    return;
  }

  console.log('query packet: %s', packet);
};
