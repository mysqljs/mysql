var Sequence = require('./Sequence');
var Util     = require('util');
var Packets  = require('../packets');

module.exports = Quit;
Util.inherits(Quit, Sequence);
function Quit(options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  Sequence.call(this, options, callback);
}

Quit.prototype.start = function() {
  this.emit('packet', new Packets.ComQuitPacket);
};
