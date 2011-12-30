var Util         = require('util');
var EventEmitter = require('events').EventEmitter;
var Parser       = require('../Parser');
var Packets      = require('./packets');
var Auth         = require('../Auth');

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

  this._scrambleBuff = null;
}

Handshake.prototype.handlePacket = function(packet) {
  if (packet.type == Parser.GREETING_PACKET) {
    this.emit('packet', new Packets.ClientAuthenticationPacket({
      number        : packet.number + 1,
      scrambleBuff  : Auth.token(this._password, packet.scrambleBuffer),
      user          : this._user,
      databasename  : this._database,
      clientFlags   : this._flags,
      maxPacketSize : this._maxPacketSize,
      charsetNumber : this._charsetNumber,
    }));

    // Keep a reference to the greeting packet. We might receive a
    // USE_OLD_PASSWORD_PROTOCOL_PACKET as a response, in which case we will need
    // the greeting packet again. See _sendOldAuth()
    this._scrambleBuff = packet.scrambleBuffer;
    return;
  }

  if (packet.type == Parser.USE_OLD_PASSWORD_PROTOCOL_PACKET) {
    this.emit('packet', new Packets.ClientAuthenticationFallbackPacket({
      number       : packet.number + 1,
      scrambleBuff : Auth.scramble323(this._scrambleBuff, this._password),
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
