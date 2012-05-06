var Parser    = require('./Parser');
var Sequences = require('./sequences');
var Packets   = require('./packets');
var Auth      = require('./Auth');
var Stream    = require('stream').Stream;
var Util      = require('util');

module.exports = Protocol;
Util.inherits(Protocol, Stream);
function Protocol(options) {
  Stream.call(this);

  options = options || {};

  this.readable = true;
  this.writable = true;

  this._parser = new Parser({packetParser: this._parsePacket.bind(this)});

  this._config   = null;
  this._callback = null;

  this._queue = [];
}

Protocol.prototype.write = function(buffer) {
  // @TODO Try..catch and handle errors
  this._parser.write(buffer);
  return true;
};

Protocol.prototype.handshake = function(config, cb) {
  this._enqueue(new Sequences.Handshake(config, cb));
};

Protocol.prototype.query = function(options, cb) {
  var query = new Sequences.Query(options, cb);
  this._enqueue(query);
  return query;
};

Protocol.prototype.end = function(cb) {
  this._enqueue(new Sequences.End(cb));
};

Protocol.prototype._enqueue = function(sequence) {
  this._queue.push(sequence);

  var self = this;
  sequence
    .on('error', function(err) {
      self._delegateError(err, sequence);
    })
    .on('data', function(buffer) {
      self.emit('data', buffer);
    })
    .on('end', function() {
      self._dequeue();
    });

  if (this._queue.length === 1) {
    sequence.start();
  }
};

Protocol.prototype._parsePacket = function(header) {
  try {
    var sequence = this._queue[0];
    var Packet   = this._determinePacket(sequence);
    var packet   = new Packet();

    sequence.trackAndVerifyPacketNumber(header.number);

    // Special case: Faster dispatch, and parsing done inside sequence
    if (Packet === Packets.RowDataPacket) {
      sequence.RowDataPacket(packet, this._parser);
      return;
    }

    packet.parse(this._parser);

    sequence[Packet.name](packet);
  } catch (err) {
    err.code = 'PARSE_ERROR';
    err.fatal = true;

    this._delegateError(err);
  }
};

Protocol.prototype._determinePacket = function(sequence) {
  var firstByte = this._parser.peak();

  if (sequence.determinePacket) {
    var Packet = sequence.determinePacket(firstByte);
    if (Packet) {
      return Packet;
    }
  }

  switch (firstByte) {
    case 0x00: return Packets.OkPacket;
    case 0xfe: return Packets.EofPacket;
    case 0xff: return Packets.ErrorPacket;
  }
};

Protocol.prototype._dequeue = function() {
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
  if (this._shouldErrorBubbleUp(err, sequence)) {
    // Can't use regular 'error' event here as that always destroys the pipe
    // between socket and protocol which is usually not what we want.
    this.emit('unhandledError', err);
  } else if (err.fatal) {
    this._queue.forEach(function(sequence) {
      sequence.end(err);
    });
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

Protocol.prototype.destroy = function(err) {
};
