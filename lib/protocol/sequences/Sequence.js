var Util         = require('util');
var EventEmitter = require('events').EventEmitter;
var PacketWriter = require('../PacketWriter');
var Packets      = require('../packets');

module.exports = Sequence;
Util.inherits(Sequence, EventEmitter);
function Sequence(parser, callback, options) {
  EventEmitter.call(this);

  this._parser   = parser;
  this._callback = callback;
  this._options  = options;
  this._number   = null;
}

Sequence.determinePacket = function(byte) {
  switch (byte) {
    case 0x00: return Packets.OkPacket;
    case 0xfe: return Packets.EofPacket;
    case 0xff: return Packets.ErrorPacket;
  }
};

Sequence.prototype.handlePacket = function(header) {
  var Packet = this._determinePacket();
  var packet = new Packet();

  this._parse(packet);

  this._trackPacketNumber(header.number);

  // @TODO Throw if handler does not exist
  this[Packet.name](packet);
};

Sequence.prototype._parse = function(packet) {
  packet.parse(this._parser);
};

Sequence.prototype._trackPacketNumber = function(number) {
  if (this._number !== null && number !== this._number + 1) {
    // @TODO handle this better
    throw new Error('Invaliad packet number');
  }

  this._number = number;
};

Sequence.prototype._emitPacket = function(packet) {
  if (this._number === null) {
    this._number = 0;
  } else {
    this._number++;
  }

  var packetWriter = new PacketWriter(this._number);
  packet.write(packetWriter);
  this.emit('data', packetWriter.toBuffer());
};

Sequence.prototype._end = function(err) {
  if (this._callback) {
    this._callback.apply(this, arguments);
  } else if (err) {
    this.emit('error', err);
  }

  this.emit('end');
};

// Implemented by child classes
Sequence.prototype.start = function() {};

Sequence.prototype['OkPacket'] = function(packet) {
  this._end();
};

Sequence.prototype['ErrorPacket'] = function(packet) {
  this._end(new Error(packet.message));
};
