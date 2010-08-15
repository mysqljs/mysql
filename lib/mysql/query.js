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

  if (packet.type == Parser.FIELD_PACKET) {
    if (!this._fields) {
      this._fields = [];
    }

    this._fields.push(packet.name);
    this.emit('field', packet);
    return;
  }

  if (packet.type == Parser.EOF_PACKET) {
    if (!this._eofs) {
      this._eofs = 1;
    } else {
      this._eofs++;
    }

    if (this._eofs == 2) {
      this.emit('end');
    }
  }
};
