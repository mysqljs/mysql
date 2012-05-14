var Parser       = require('./Parser');
var Sequences    = require('./sequences');
var Packets      = require('./packets');
var Auth         = require('./Auth');
var Stream       = require('stream').Stream;
var Util         = require('util');
var PacketWriter = require('./PacketWriter');

module.exports = Protocol;
Util.inherits(Protocol, Stream);
function Protocol(options) {
  Stream.call(this);

  options = options || {};

  this.readable = true;
  this.writable = true;

  this._parser       = new Parser({packetParser: this._parsePacket.bind(this)});
  this._config       = options.config || {};
  this._callback     = null;
  this._fatalError   = null;
  this._quitSequence = null;
  this._destroyed    = false;

  this._queue = [];
}

Protocol.prototype.write = function(buffer) {
  try {
    this._parser.write(buffer);
    return true;
  } catch (err) {
    err.code = err.code || 'PROTOCOL_PARSER_EXCEPTION';
    err.fatal = true;

    this._delegateError(err);
  }

  return false;
};

Protocol.prototype.handshake = function(cb) {
  return this._enqueue(new Sequences.Handshake(this._config, cb));
};

Protocol.prototype.query = function(options, cb) {
  return this._enqueue(new Sequences.Query(options, cb));
};

Protocol.prototype.quit = function(cb) {
  return this._quitSequence = this._enqueue(new Sequences.Quit(cb));
};

Protocol.prototype.end = function() {
  var expected = (this._quitSequence && this._queue[0] === this._quitSequence);
  if (expected) {
    this._quitSequence.end();
    this.emit('close');
    return;
  }

  var err = new Error('Connection lost: The server closed the connection.');
  err.fatal = true;
  err.code = 'PROTOCOL_CONNECTION_LOST';

  this._delegateError(err);
};

Protocol.prototype.pause = function() {
  this._parser.pause();
};

Protocol.prototype.resume = function() {
  this._parser.resume();
};

Protocol.prototype._enqueue = function(sequence) {
  var cannotEnqueue = (this._quitSequence || this._destroyed);
  if (cannotEnqueue) {
    var prefix = 'Cannot enqueue ' + sequence.constructor.name + ' after ';

    var err;
    if (this._quitSequence) {
      err      = new Error(prefix + ' after invoking quit.');
      err.code = 'PROTOCOL_ENQUEUE_AFTER_QUIT';
    } else if (this._destroyed) {
      err      = new Error(prefix + ' after being destroyed.');
      err.code = 'PROTOCOL_ENQUEUE_AFTER_DESTROY';
    }

    err.fatal = false;
    sequence.on('error', function() {});
    sequence.end(err);
    return sequence;
  }

  this._queue.push(sequence);

  var self = this;
  sequence
    .on('error', function(err) {
      self._delegateError(err, sequence);
    })
    .on('packet', function(number, packet) {
      self._emitPacket(number, packet);
    })
    .on('end', function() {
      self._dequeue();
    });

  if (this._queue.length === 1) {
    sequence.start();
  }

  return sequence;
};

Protocol.prototype._parsePacket = function(header) {
  var sequence = this._queue[0];
  var Packet   = this._determinePacket(sequence, header);
  var packet   = new Packet();

  sequence.trackAndVerifyPacketNumber(header.number);

  // Special case: Faster dispatch, and parsing done inside sequence
  if (Packet === Packets.RowDataPacket) {
    sequence.RowDataPacket(packet, this._parser);

    if (this._config.debug) {
      this._debugPacket(true, header.number, packet);
    }

    return;
  }

  packet.parse(this._parser);

  if (this._config.debug) {
    this._debugPacket(true, header.number, packet);
  }

  sequence[Packet.name](packet);

};

Protocol.prototype._emitPacket = function(number, packet) {
  var packetWriter = new PacketWriter(number);
  packet.write(packetWriter);
  this.emit('data', packetWriter.toBuffer());

  if (this._config.debug) {
    this._debugPacket(false, number, packet)
  }
};

Protocol.prototype._determinePacket = function(sequence, header) {
  var firstByte = this._parser.peak();

  if (sequence.determinePacket) {
    var Packet = sequence.determinePacket(firstByte, header);
    if (Packet) {
      return Packet;
    }
  }

  switch (firstByte) {
    case 0x00: return Packets.OkPacket;
    case 0xfe: return Packets.EofPacket;
    case 0xff: return Packets.ErrorPacket;
  }

  throw new Error('Could not determine packet, firstByte = ' + firstByte);
};

Protocol.prototype._dequeue = function() {
  // No point in advancing the queue, we are dead
  if (this._fatalError) {
    return;
  }

  this._queue.shift();

  var sequence = this._queue[0];
  if (sequence) {
    sequence.start();
  }
};

Protocol.prototype.handleNetworkError = function(err) {
  err.fatal = true;
  this._delegateError(err);
};

Protocol.prototype._delegateError = function(err, sequence) {
  // Stop delegating errors after the first fatal error
  if (this._fatalError) {
    return;
  }

  if (err.fatal) {
    this._fatalError = err;
  }

  if (this._shouldErrorBubbleUp(err, sequence)) {
    // Can't use regular 'error' event here as that always destroys the pipe
    // between socket and protocol which is not what we want (unless the
    // exception was fatal).
    this.emit('unhandledError', err);
  } else if (err.fatal) {
    this._queue.forEach(function(sequence) {
      sequence.end(err);
    });
  }

  // Make sure the stream we are piping to is getting closed
  if (err.fatal) {
    this.emit('close', err);
  }
};

Protocol.prototype._shouldErrorBubbleUp = function(err, sequence) {
  if (sequence) {
    if (sequence.hasErrorHandler()) {
      return false;
    } else if (!err.fatal) {
      return true;
    }
  }

  return (err.fatal && !this._hasPendingErrorHandlers());
};

Protocol.prototype._hasPendingErrorHandlers = function() {
  return this._queue.some(function(sequence) {
    return sequence.hasErrorHandler();
  });
};

Protocol.prototype.destroy = function() {
  this._destroyed = true;
  this._parser.pause();
};

Protocol.prototype._debugPacket = function(incoming, number, packet) {
  var headline = (incoming)
    ? '<-- '
    : '--> ';

  headline = headline + packet.constructor.name + ' (#' + number + ')';

  console.log(headline);
  console.log(packet);
  console.log('');
};
