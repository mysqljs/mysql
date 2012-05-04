var Util           = require('util');
var EventEmitter   = require('events').EventEmitter;
var PacketWriter   = require('../PacketWriter');
var Packets        = require('../packets');
var ErrorConstants = require('../constants/errors');

module.exports = Sequence;
Util.inherits(Sequence, EventEmitter);
function Sequence(parser, callback, options) {
  EventEmitter.call(this);

  this._parser     = parser;
  this._callback   = callback;
  this._options    = options;
  this._nextNumber = 0;
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

  this._trackAndVerifyPacketNumber(header.number);

  // Performance: This speeds up the row parsing benchmark from ~235 kHz to
  // ~280 kHz.
  if (Packet === Packets.RowDataPacket) {
    this.RowDataPacket(packet);
    return;
  }

  // @TODO Throw if handler does not exist
  this[Packet.name](packet);
};

Sequence.prototype._parse = function(packet) {
  packet.parse(this._parser);
};

Sequence.prototype._trackAndVerifyPacketNumber = function(number) {
  if (number !== this._nextNumber) {
    // @TODO handle this better
    throw new Error('Invaliad packet number, got: ' + number + ' expected: ' + this._nextNumber);
  }

  this._nextNumber = (this._nextNumber + 1) % 256;
};

Sequence.prototype._emitPacket = function(packet) {
  var packetWriter = new PacketWriter(this._nextNumber);
  packet.write(packetWriter);
  this.emit('data', packetWriter.toBuffer());

  this._nextNumber = (this._nextNumber + 1) % 256;
};

Sequence.prototype.end = function(err) {
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
  this.end();
};

Sequence.prototype['ErrorPacket'] = function(packet) {
  var err = new Error(packet.message);
  err.code = ErrorConstants[packet.errno] || 'UNKNOWN_CODE_PLEASE_REPORT';

  this.end(err);
};
