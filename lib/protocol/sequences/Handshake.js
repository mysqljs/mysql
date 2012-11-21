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

Handshake.prototype.determinePacket = function(firstByte) {
  if (firstByte === 0xff) {
    return Packets.ErrorPacket;
  }

  if (!this._handshakeInitializationPacket) {
    return Packets.HandshakeInitializationPacket;
  }

  if (firstByte === 0xfe) {
    return Packets.UseOldPasswordPacket;
  }
};

Handshake.prototype['HandshakeInitializationPacket'] = function(packet) {
  this._handshakeInitializationPacket = packet;

  this._config.protocol41 = packet.protocol41;

  this.emit('packet', new Packets.ClientAuthenticationPacket({
    clientFlags   : this._config.clientFlags,
    maxPacketSize : this._config.maxPacketSize,
    charsetNumber : this._config.charsetNumber,
    user          : this._config.user,
    scrambleBuff  : (packet.protocol41)
                     ? Auth.token(this._config.password, packet.scrambleBuff())
                     : Auth.scramble323(packet.scrambleBuff(), this._config.password),
    database      : this._config.database,
    protocol41    : packet.protocol41
  }));
};

Handshake.prototype['UseOldPasswordPacket'] = function(packet) {
  if (!this._config.insecureAuth) {
    var err = new Error(
      'MySQL server is requesting the old and insecure pre-4.1 auth mechanism.' +
      'Upgrade the user password or use the {insecureAuth: true} option.'
    );

    err.code = 'HANDSHAKE_INSECURE_AUTH';
    err.fatal = true;

    this.end(err);
    return;
  }

  this.emit('packet', new Packets.OldPasswordPacket({
    scrambleBuff : Auth.scramble323(this._handshakeInitializationPacket.scrambleBuff(), this._config.password),
  }));
};

Handshake.prototype['ErrorPacket'] = function(packet) {
  var err = this._packetToError(packet, true);
  err.fatal = true;
  this.end(err);
};
