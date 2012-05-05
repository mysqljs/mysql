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
  this._enqueue(new Sequences.Query(options, cb));
};

Protocol.prototype.end = function(cb) {
  this._enqueue(new Sequences.End(cb));
};

Protocol.prototype._enqueue = function(sequence) {
  this._queue.push(sequence);

  if (this._queue.length === 1) {
    this._executeSequence(sequence);
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
    this.fatalError(err);
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

Protocol.prototype._executeSequence = function(sequence) {
  var self = this;

  sequence
    .on('error', function(err) {
      self._handleSequenceError(sequence, err);
    })
    .on('data', function(buffer) {
      self.emit('data', buffer);
    })
    .on('end', function() {
      self._dequeue();
    });

  sequence.start();
};

Protocol.prototype._dequeue = function() {
  this._queue.shift();

  var sequence = this._queue[0];
  if (sequence) {
    this._executeSequence(sequence);
  }
};

Protocol.prototype._handleSequenceError = function(sequence, err) {
  var bubbleUp = (sequence.hasCallback())
    ? false
    : err.fatal && !this._hasPendingCallbacks();

  if (bubbleUp) {
    this.emit('error', err);
  }

  if (err.fatal) {
    this.fatalError(err);
  }
};

Protocol.prototype._hasPendingCallbacks = function() {
  return this._queue.some(function(sequence) {
    return sequence.hasCallback();
  });
};

Protocol.prototype.fatalError = function(err) {
  err.fatal = true;

  var pendingSequences = this._queue;
  this._queue = [];

  pendingSequences.forEach(function(sequence) {
    sequence.invokeCallback(err);
  });
};

Protocol.prototype.destroy = function(err) {
};
