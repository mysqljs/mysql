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

  this._started = false;
}

Quit.prototype.end = function end(err) {
  if (this._ended) {
    return;
  }

  if (!this._started) {
    Sequence.prototype.end.call(this, err);
    return;
  }

  if (err && err.code === 'ECONNRESET' && err.syscall === 'read') {
    // Ignore read errors after packet sent
    Sequence.prototype.end.call(this);
    return;
  }

  Sequence.prototype.end.call(this, err);
};

Quit.prototype.start = function() {
  this._started = true;
  this.emit('packet', new Packets.ComQuitPacket());
};
