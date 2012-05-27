var Sequence = require('./Sequence');
var Util     = require('util');
var Packets  = require('../packets');

module.exports = Quit;
Util.inherits(Quit, Sequence);
function Quit(callback) {
  Sequence.call(this, callback);
}

Quit.prototype.start = function() {
  this.emit('packet', new Packets.ComQuitPacket);
};
