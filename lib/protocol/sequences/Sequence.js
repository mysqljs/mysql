var Util           = require('util');
var EventEmitter   = require('events').EventEmitter;
var Packets        = require('../packets');
var ErrorConstants = require('../constants/errors');

module.exports = Sequence;
Util.inherits(Sequence, EventEmitter);
function Sequence(callback) {
  EventEmitter.call(this);

  this._callback         = callback;
  this._ended            = false;

  // Experimental: Long stack trace support
  this._callSite = (new Error).stack.replace(/.+\n/, '');
}

Sequence.determinePacket = function(byte) {
  switch (byte) {
    case 0x00: return Packets.OkPacket;
    case 0xfe: return Packets.EofPacket;
    case 0xff: return Packets.ErrorPacket;
  }
};

Sequence.prototype.hasErrorHandler = function() {
  return this._callback || this.listeners('error').length > 1;
};

Sequence.prototype._packetToError = function(packet) {
  var code = ErrorConstants[packet.errno] || 'UNKNOWN_CODE_PLEASE_REPORT';
  var err  = new Error(code + ': ' + packet.message);
  err.code = code;

  return err;
};

Sequence.prototype._addLongStackTrace = function(err) {
  var delimiter = '\n    --------------------\n' ;
  if (err.stack.indexOf(delimiter) > -1) {
    return;
  }

  err.stack += delimiter + this._callSite;
};

Sequence.prototype.end = function(err) {
  if (this._ended) {
    return;
  }

  this._ended = true;
  var self    = this;
  var args    = arguments;

  if (err) {
    this._addLongStackTrace(err);
  }


  // Escape stack (so try..catch in Protocol#write does not interfer here)
  process.nextTick(function() {
    if (err) {
      self.emit('error', err);
    }

    if (self._callback) {
      self._callback.apply(self, args);
    }

    self.emit('end');
  });
};

Sequence.prototype['OkPacket'] = function(packet) {
  this.end(null, packet);
};

Sequence.prototype['ErrorPacket'] = function(packet) {
  var err = Sequence.packetToError(packet);
  this.end(err);
};

// Implemented by child classes
Sequence.prototype.start = function() {};
