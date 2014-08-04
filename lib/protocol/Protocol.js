var Parser       = require('./Parser');
var Sequences    = require('./sequences');
var Packets      = require('./packets');
var Timers       = require('timers');
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
  this._ended                         = false;
  this._destroyed                     = false;
  this._queue                         = [];
  this._handshakeInitializationPacket = null;

  this._parser = new Parser({
    onError  : this.handleParserError.bind(this),
    onPacket : this._parsePacket.bind(this),
    config   : this._config
  });
}

Protocol.prototype.write = function(buffer) {
  this._parser.write(buffer);
  return true;
};

Protocol.prototype.handshake = function handshake(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  options = options || {};
  options.config = this._config;

  return this._handshakeSequence = this._enqueue(new Sequences.Handshake(options, callback));
};

Protocol.prototype.query = function query(options, callback) {
  return this._enqueue(new Sequences.Query(options, callback));
};

Protocol.prototype.changeUser = function changeUser(options, callback) {
  return this._enqueue(new Sequences.ChangeUser(options, callback));
};

Protocol.prototype.ping = function ping(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  return this._enqueue(new Sequences.Ping(options, callback));
};

Protocol.prototype.stats = function stats(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  return this._enqueue(new Sequences.Statistics(options, callback));
};

Protocol.prototype.quit = function quit(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  return this._quitSequence = this._enqueue(new Sequences.Quit(options, callback));
};

Protocol.prototype.end = function() {
  if(this._ended) {
    return;
  }
  this._ended = true;

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

  if (this._config.trace) {
    // Long stack trace support
    sequence._callSite = sequence._callSite || new Error;
  }

  this._queue.push(sequence);

  var self = this;
  sequence
    .on('error', function(err) {
      self._delegateError(err, sequence);
    })
    .on('packet', function(packet) {
      Timers.active(sequence);
      self._emitPacket(packet);
    })
    .on('end', function() {
      self._dequeue(sequence);
    })
    .on('timeout', function() {
      var err = new Error(sequence.constructor.name + ' inactivity timeout');

      err.code    = 'PROTOCOL_SEQUENCE_TIMEOUT';
      err.fatal   = true;
      err.timeout = sequence._timeout;

      self._delegateError(err, sequence);
    })
    .on('start-tls', function() {
      Timers.active(sequence);
      self._connection._startTLS(function(err) {
        if (err) {
          // SSL negotiation error are fatal
          err.code  = 'HANDSHAKE_SSL_ERROR';
          err.fatal = true;
          sequence.end(err);
          return
        }

        Timers.active(sequence);
        sequence._tlsUpgradeCompleteHandler();
      }) 
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

  if (this._fatalError) {
    err      = new Error(prefixAfter + 'fatal error.');
    err.code = 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR';
  } else if (this._quitSequence) {
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

  if (!sequence) {
    var err   = new Error('Received packet with no active sequence.');
    err.code  = 'PROTOCOL_STRAY_PACKET';
    err.fatal = true;

    this._delegateError(err);
    return;
  }

  var Packet     = this._determinePacket(sequence);
  var packet     = new Packet({protocol41: this._config.protocol41});
  var packetName = Packet.name;

  // Special case: Faster dispatch, and parsing done inside sequence
  if (Packet === Packets.RowDataPacket) {
    sequence.RowDataPacket(packet, this._parser, this._connection);

    if (this._config.debug) {
      this._debugPacket(true, packet);
    }

    return;
  }

  if (this._config.debug) {
    this._parsePacketDebug(packet);
  } else {
    packet.parse(this._parser);
  }

  if (Packet === Packets.HandshakeInitializationPacket) {
    this._handshakeInitializationPacket = packet;
  }

  Timers.active(sequence);

  if (!sequence[packetName]) {
    var err   = new Error('Received packet in the wrong sequence.');
    err.code  = 'PROTOCOL_INCORRECT_PACKET_SEQUENCE';
    err.fatal = true;

    this._delegateError(err);
    return;
  }

  sequence[packetName](packet);
};

Protocol.prototype._parsePacketDebug = function _parsePacketDebug(packet) {
  try {
    packet.parse(this._parser);
  } finally {
    this._debugPacket(true, packet);
  }
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
        this.emit('handshake', this._handshakeInitializationPacket);
      }
      return Packets.OkPacket;
    case 0xfe: return Packets.EofPacket;
    case 0xff: return Packets.ErrorPacket;
  }

  throw new Error('Could not determine packet, firstByte = ' + firstByte);
};

Protocol.prototype._dequeue = function(sequence) {
  Timers.unenroll(sequence);

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
  if (sequence._timeout > 0 && isFinite(sequence._timeout)) {
    Timers.enroll(sequence, sequence._timeout);
    Timers.active(sequence);
  }

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

Protocol.prototype.handleParserError = function handleParserError(err) {
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
    // Send fatal error to all sequences in the queue
    var queue = this._queue;
    process.nextTick(function () {
      queue.forEach(function (sequence) {
        sequence.end(err);
      });
      queue.length = 0;
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

  if (this._connection.state !== "disconnected") {
    if(!this._ended) {
      this.end();
    }
  }
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
