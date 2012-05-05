var Sequence = require('./Sequence');
var Util     = require('util');
var Packets  = require('../packets');

module.exports = End;
Util.inherits(End, Sequence);
function End(parser, callback) {
  Sequence.call(this, callback);
}

End.prototype.start = function() {
  this._emitPacket(new Packets.ComQuitPacket);
};
