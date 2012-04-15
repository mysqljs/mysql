var Packets = require('../packets');
var Auth    = require('../Auth');

module.exports = Handshake;
function Handshake(config, callback) {
  this._config   = config;
  this._callback = callback;
}

Handshake.prototype.handlePacket = function(packet) {
  if (packet instanceof Packets.HandshakeInitializationPacket) {
    return this._authenticate(packet);
  }

  if (packet instanceof Packets.OkPacket) {
    this._callback(null);
    return;
  }
};

Handshake.prototype._authenticate = function(packet) {
  return new Packets.ClientAuthenticationPacket({
    clientFlags   : this._config.clientFlags,
    maxPacketSize : this._config.maxPacketSize,
    charsetNumber : this._config.charsetNumber,
    user          : this._config.user,
    scrambleBuff  : Auth.token(this._config.password, packet.scrambleBuff()),
    database      : this._config.database,
  });
};
