var Sequence = require('./Sequence');
var Util     = require('util');
var Packets  = require('../packets');
var Auth     = require('../Auth');

module.exports = Handshake;
Util.inherits(Handshake, Sequence);
function Handshake(config, callback) {
  Sequence.call(this, callback);

  this._config                        = config;
  this._handshakeInitializationPacket = null;
}

Handshake.prototype.determinePacket = function() {
  if (!this._handshakeInitializationPacket) {
    return Packets.HandshakeInitializationPacket;
  }
};

Handshake.prototype['HandshakeInitializationPacket'] = function(packet) {
  this._handshakeInitializationPacket = packet;

  this.emit('packet', new Packets.ClientAuthenticationPacket({
    clientFlags   : this._config.clientFlags,
    maxPacketSize : this._config.maxPacketSize,
    charsetNumber : this._config.charsetNumber,
    user          : this._config.user,
    scrambleBuff  : Auth.token(this._config.password, packet.scrambleBuff()),
    database      : this._config.database,
  }));
};

Handshake.prototype['ErrorPacket'] = function(packet) {
  var err = this._packetToError(packet, true);
  err.fatal = true;
  this.end(err);
};
