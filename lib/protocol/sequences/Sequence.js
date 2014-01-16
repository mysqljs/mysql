var Util           = require('util');
var EventEmitter   = require('events').EventEmitter;
var Packets        = require('../packets');
var ErrorConstants = require('../constants/errors');

module.exports = Sequence;
Util.inherits(Sequence, EventEmitter);
function Sequence(callback) {
  EventEmitter.call(this);

  this._callback         = callback;
  this._callSite         = null;
  this._ended            = false;
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
  err.errno = packet.errno;
  err.sqlState = packet.sqlState;

  return err;
};

Sequence.prototype._addLongStackTrace = function(err) {
  if (!this._callSite) {
    return;
  }

  var delimiter = '\n    --------------------\n' ;

  if (err.stack.indexOf(delimiter) > -1) {
    return;
  }

  err.stack += delimiter + this._callSite.stack.replace(/.+\n/, '');
};

Sequence.prototype.end = function(err) {
  if (this._ended) {
    return;
  }

  this._ended = true;

  if (err) {
    this._addLongStackTrace(err);
  }

  // Without this we are leaking memory. This problem was introduced in
  // 8189925374e7ce3819bbe88b64c7b15abac96b16. I suspect that the error object
  // causes a cyclic reference that the GC does not detect properly, but I was
  // unable to produce a standalone version of this leak. This would be a great
  // challenge for somebody interested in difficult problems : )!
  this._callSite = null;

  // try...finally for exception safety
  try {
    if (err) {
      this.emit('error', err);
    }
  } finally {
    try {
      if (this._callback) {
        this._callback.apply(this, arguments);
      }
    } finally {
      this.emit('end');
    }
  }
};

Sequence.prototype['OkPacket'] = function(packet) {
  this.end(null, packet);
};

Sequence.prototype['ErrorPacket'] = function(packet) {
  this.end(this._packetToError(packet));
};

// Implemented by child classes
Sequence.prototype.start = function() {};
