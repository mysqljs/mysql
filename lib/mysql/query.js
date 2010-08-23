if (global.GENTLY) require = GENTLY.hijack(require);

var sys = require('sys'),
    EventEmitter = require('events').EventEmitter,
    Parser = require('./parser'),
    Client;

function Query() {
  EventEmitter.call(this);
}
sys.inherits(Query, EventEmitter);
module.exports = Query;

Query.prototype._handlePacket = function(packet) {
  var self = this;

  // We can't do this require() on top of the file.
  // That's because there is circular dependency and we're overwriting
  // module.exports
  Client = Client || require('./client');

  switch (packet.type) {
    case Parser.OK_PACKET:
      this.emit('end', Client._packetToUserObject(packet));
      break;
    case Parser.ERROR_PACKET:
      this.emit('error', Client._packetToUserObject(packet));
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
    case Parser.ROW_DATA_PACKET:
      var row = this._row = {},
          field = this._fields[0];

      this._rowIndex = 0;
      row[field] = '';

      packet.on('data', function(buffer, remaining) {
        if (buffer) {
          row[field] += buffer;
        } else {
          row[field] = null;
        }

        if (remaining == 0) {
          self._rowIndex++;
          if (self._rowIndex == self._fields.length) {
             delete self._row;
             delete self._rowIndex;
             self.emit('row', row);
             return;
          }

          field = self._fields[self._rowIndex];
          row[field] = '';
        }
      });
      break;
  }
};
