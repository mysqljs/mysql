var Sequence = require('./Sequence');
var Util     = require('util');
var Packets  = require('../packets');
var Auth     = require('../Auth');

module.exports = Handshake;
Util.inherits(Handshake, Sequence);
function Handshake(parser, callback, options) {
  Sequence.call(this, parser, callback, options);

  this._receivedHandshakeInitializationPacket = false;
}

Handshake.prototype._determinePacket = function() {
  if (!this._receivedHandshakeInitializationPacket) {
    return Packets.HandshakeInitializationPacket;
  }

  return Sequence.determinePacket(this._parser.peak());
};

Handshake.prototype['HandshakeInitializationPacket'] = function(packet) {
  this._receivedHandshakeInitializationPacket = true;

  this._emitPacket(new Packets.ClientAuthenticationPacket({
    clientFlags   : this._options.clientFlags,
    maxPacketSize : this._options.maxPacketSize,
    charsetNumber : this._options.charsetNumber,
    user          : this._options.user,
    scrambleBuff  : Auth.token(this._options.password, packet.scrambleBuff()),
    database      : this._options.database,
  }));
};
