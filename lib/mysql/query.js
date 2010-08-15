var sys = require('sys'),
    EventEmitter = require('events').EventEmitter,
    Parser = require('./parser');

function Query() {
  EventEmitter.call(this);
}
sys.inherits(Query, EventEmitter);
module.exports = Query;

Query.prototype._handlePacket = function(packet) {
  switch (packet.type) {
    case Parser.OK_PACKET:
      this.emit('end', packet);
      break;
    case Parser.ERROR_PACKET:
      this.emit('error', packet);
      break;
    case Parser.FIELD_PACKET:
      if (!this._fields) {
        this._fields = [];
      }

      this._fields.push(packet.name);
      this.emit('field', packet);
      break;
    case Parser.EOF_PACKET:
      if (!this._eofs) {
        this._eofs = 1;
      } else {
        this._eofs++;
      }

      if (this._eofs == 2) {
        this.emit('end');
      }
      break;
  }
};
