var Util           = require('util');
var EventEmitter   = require('events').EventEmitter;
var PacketWriter   = require('../PacketWriter');
var Packets        = require('../packets');
var ErrorConstants = require('../constants/errors');

module.exports = Sequence;
Util.inherits(Sequence, EventEmitter);
function Sequence(callback) {
  EventEmitter.call(this);

  this._callback         = callback;
  this._nextPacketNumber = 0;
}

Sequence.determinePacket = function(byte) {
  switch (byte) {
    case 0x00: return Packets.OkPacket;
    case 0xfe: return Packets.EofPacket;
    case 0xff: return Packets.ErrorPacket;
  }
};

Sequence.packetToError = function(packet) {
  var err = new Error(packet.message);
  err.code = ErrorConstants[packet.errno] || 'UNKNOWN_CODE_PLEASE_REPORT';
  return err;
};

Sequence.prototype.trackAndVerifyPacketNumber = function(number) {
  if (number !== this._nextPacketNumber) {
    // @TODO handle this better
    throw new Error(
      'Invaliad packet number, got: ' + number + ' ' +
      'expected: ' + this._nextPacketNumber
    );
  }

  this._incrementNextPacketNumber();
};

Sequence.prototype._emitPacket = function(packet) {
  var packetWriter = new PacketWriter(this._nextPacketNumber);
  packet.write(packetWriter);
  this.emit('data', packetWriter.toBuffer());

  this._incrementNextPacketNumber();
};

Sequence.prototype._incrementNextPacketNumber = function() {
  this._nextPacketNumber = (this._nextPacketNumber + 1) % 256;
};

Sequence.prototype.end = function(err) {
  if (this._callback) {
    this._callback.apply(this, arguments);
  } else if (err) {
    this.emit('error', err);
  }

  this.emit('end');

  if (err.fatal) {
    this.emit('fatalError', err);
    return;
  }
};

Sequence.prototype['OkPacket'] = function(packet) {
  this.end(null);
};

Sequence.prototype['ErrorPacket'] = function(packet) {
  var err = Sequence.packetToError(packet);
  this.end(err);
};

// Implemented by child classes
Sequence.prototype.start = function() {};
