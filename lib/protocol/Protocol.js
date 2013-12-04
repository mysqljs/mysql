var Parser       = require('./Parser');
var Sequences    = require('./sequences');
var Packets      = require('./packets');
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

  this._config                        = options.config || {};
  this._connection                    = options.connection;
  this._callback                      = null;
  this._fatalError                    = null;
  this._quitSequence                  = null;
  this._handshakeSequence             = null;
  this._handshaked                    = false;
  this._destroyed                     = false;
  this._queue                         = [];
  this._handshakeInitializationPacket = null;

  this._parser = new Parser({
    onPacket : this._parsePacket.bind(this),
    config   : this._config
  });
}

Protocol.prototype.write = function(buffer) {
  this._parser.write(buffer);
  return true;
};

Protocol.prototype.handshake = function(cb) {
  return this._handshakeSequence = this._enqueue(new Sequences.Handshake(this._config, cb));
};

Protocol.prototype.query = function(options, cb) {
  return this._enqueue(new Sequences.Query(options, cb));
};

Protocol.prototype.changeUser = function(options, cb) {
  return this._enqueue(new Sequences.ChangeUser(options, cb));
};

Protocol.prototype.ping = function(cb) {
  return this._enqueue(new Sequences.Ping(cb));
};

Protocol.prototype.stats = function(cb) {
  return this._enqueue(new Sequences.Statistics(cb));
};

Protocol.prototype.quit = function(cb) {
  return this._quitSequence = this._enqueue(new Sequences.Quit(cb));
};

Protocol.prototype.end = function() {
  var expected = (this._quitSequence && this._queue[0] === this._quitSequence);
  if (expected) {
    this._quitSequence.end();
    this.emit('end');
    return;
  }

  var err = new Error('Connection lost: The server closed the connection.');
  err.fatal = true;
  err.code = 'PROTOCOL_CONNECTION_LOST';

  this._delegateError(err);
};

Protocol.prototype.pause = function() {
  this._parser.pause();
  // Since there is a file stream in query, we must transmit pause/resume event to current sequence.
  var seq = this._queue[0];
  if (seq && seq.emit) {
    seq.emit('pause');
  }
};

Protocol.prototype.resume = function() {
  this._parser.resume();
  // Since there is a file stream in query, we must transmit pause/resume event to current sequence.
  var seq = this._queue[0];
  if (seq && seq.emit) {
    seq.emit('resume');
  }
};

Protocol.prototype._enqueue = function(sequence) {
  if (!this._validateEnqueue(sequence)) {
    return sequence;
  }

  this._queue.push(sequence);

  var self = this;
  sequence
    .on('error', function(err) {
      self._delegateError(err, sequence);
    })
    .on('packet', function(packet) {
      self._emitPacket(packet);
    })
    .on('end', function() {
      self._dequeue();
    });

  if (this._queue.length === 1) {
    this._parser.resetPacketNumber();
    this._startSequence(sequence);
  }

  return sequence;
};

Protocol.prototype._validateEnqueue = function(sequence) {
  var err;
  var prefix = 'Cannot enqueue ' + sequence.constructor.name;
  var prefixBefore = prefix + ' before ';
  var prefixAfter = prefix + ' after ';

  if (this._quitSequence) {
    err      = new Error(prefixAfter + 'invoking quit.');
    err.code = 'PROTOCOL_ENQUEUE_AFTER_QUIT';
  } else if (this._destroyed) {
    err      = new Error(prefixAfter + 'being destroyed.');
    err.code = 'PROTOCOL_ENQUEUE_AFTER_DESTROY';
  } else if (this._handshakeSequence && sequence.constructor === Sequences.Handshake) {
    err      = new Error(prefixAfter + 'already enqueuing a Handshake.');
    err.code = 'PROTOCOL_ENQUEUE_HANDSHAKE_TWICE';
  } else if (!this._handshakeSequence && sequence.constructor === Sequences.ChangeUser) {
    err      = new Error(prefixBefore + 'a Handshake.');
    err.code = 'PROTOCOL_ENQUEUE_BEFORE_HANDSHAKE';
  } else {
    return true;
  }

  var self  = this;
  err.fatal = false;

  sequence
    .on('error', function(err) {
      self._delegateError(err, sequence);
    })
    .end(err);

  return false;
};

Protocol.prototype._parsePacket = function() {
  var sequence = this._queue[0];
  var Packet   = this._determinePacket(sequence);
  var packet   = new Packet({
    protocol41: this._config.protocol41
  });

  // Special case: Faster dispatch, and parsing done inside sequence
  if (Packet === Packets.RowDataPacket) {
    sequence.RowDataPacket(packet, this._parser, this._connection);

    if (this._config.debug) {
      this._debugPacket(true, packet);
    }

    return;
  }

  packet.parse(this._parser);

  if (this._config.debug) {
    this._debugPacket(true, packet);
  }

  if (Packet === Packets.HandshakeInitializationPacket) {
    this._handshakeInitializationPacket = packet;
  }

  sequence[Packet.name](packet);
};

Protocol.prototype._emitPacket = function(packet) {
  var packetWriter = new PacketWriter();
  packet.write(packetWriter);
  this.emit('data', packetWriter.toBuffer(this._parser));

  if (this._config.debug) {
    this._debugPacket(false, packet);
  }
};

Protocol.prototype._determinePacket = function(sequence) {
  var firstByte = this._parser.peak();

  if (sequence.determinePacket) {
    var Packet = sequence.determinePacket(firstByte, this._parser);
    if (Packet) {
      return Packet;
    }
  }

  switch (firstByte) {
    case 0x00:
      if (!this._handshaked) {
        this._handshaked = true;
        this.emit('handshake');
      }
      return Packets.OkPacket;
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
  if (!sequence) {
    this.emit('drain');
    return;
  }

  this._parser.resetPacketNumber();

  this._startSequence(sequence);
};

Protocol.prototype._startSequence = function(sequence) {
  if (sequence.constructor === Sequences.ChangeUser) {
    sequence.start(this._handshakeInitializationPacket);
  } else {
    sequence.start();
  }
};

Protocol.prototype.handleNetworkError = function(err) {
  err.fatal = true;

  var sequence = this._queue[0];
  if (sequence) {
    sequence.end(err);
  } else {
    this._delegateError(err);
  }
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
    this.emit('end', err);
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

Protocol.prototype._debugPacket = function(incoming, packet) {
  var headline = (incoming)
    ? '<-- '
    : '--> ';

  headline = headline + packet.constructor.name;

  // check for debug packet restriction
  if (Array.isArray(this._config.debug) && this._config.debug.indexOf(packet.constructor.name) === -1) {
    return;
  }

  console.log(headline);
  console.log(packet);
  console.log('');
};
