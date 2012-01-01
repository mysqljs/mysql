var Util         = require('util');
var EventEmitter = require('events').EventEmitter;
var Parser       = require('../../Parser');
var Packets      = require('../packets');
var Password     = require('../Password');
var BufferList   = require('../util/BufferList');

module.exports = Handshake;
Util.inherits(Handshake, EventEmitter);
function Handshake(properties) {
  EventEmitter.call(this);

  this._password      = properties.password;
  this._user          = properties.user;
  this._database      = properties.database;
  this._flags         = properties.flags;
  this._maxPacketSize = properties.maxPacketSize;
  this._charsetNumber = properties.charsetNumber;

  this._handshakeInitializationPacket = new Packets.HandshakeInitializationPacket;
  this._scrambleBuff = null;
}

Handshake.prototype.write = function(buffer) {
  if (!this._handshakeInitializationPacket) return 0;

  var packet   = this._handshakeInitializationPacket;
  var complete = packet.write(buffer);

  if (complete) {
    var scrambleBuffer = new BufferList([packet.scrambleBuff1, packet.scrambleBuff2]);
    this._handshakeInitializationPacket = null;

    this.emit('packet', new Packets.ClientAuthenticationPacket({
      number        : packet.number.value + 1,
      scrambleBuff  : Password.token(this._password, scrambleBuffer),
      user          : this._user,
      databasename  : this._database,
      clientFlags   : this._flags,
      maxPacketSize : this._maxPacketSize,
      charsetNumber : this._charsetNumber,
    }));

    this._scrambleBuff = scrambleBuffer;
  }

  return packet.bytesWritten;
};

Handshake.prototype.handlePacket = function(packet) {
  if (packet.type == Parser.USE_OLD_PASSWORD_PROTOCOL_PACKET) {
    this.emit('packet', new Packets.ClientAuthenticationFallbackPacket({
      number       : packet.number + 1,
      scrambleBuff : Password.scramble323(this._scrambleBuff, this._password),
    }));
    return;
  }

  if (packet.type != Parser.ERROR_PACKET) {
    this.emit('end');
    return;
  }

  // @TODO: Refactor WIP Emitting a packet on error is really goofy, this
  // should be a node error object.
  this.emit('error', packet);
};
