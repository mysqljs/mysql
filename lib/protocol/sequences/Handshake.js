var Packets = require('../packets');
var Auth    = require('../Auth');

module.exports = Handshake;
function Handshake(options) {
  this._config   = options.config;
  this._parser   = options.parser;
  this._callback = options.callback;

  this._receivedClientAuthenticationPacket = false;
}

Handshake.prototype.handlePacket = function() {
  if (!this._receivedClientAuthenticationPacket) {
    this._receivedClientAuthenticationPacket = true;
    return this._authenticate();
  }

  console.log(this._parser);
};

Handshake.prototype._authenticate = function() {
  var packet = this._parser.parse(Packets.HandshakeInitializationPacket);

  return new Packets.ClientAuthenticationPacket({
    clientFlags   : this._config.clientFlags,
    maxPacketSize : this._config.maxPacketSize,
    charsetNumber : this._config.charsetNumber,
    user          : this._config.user,
    scrambleBuff  : Auth.token(this._config.password, packet.scrambleBuff()),
    database      : this._config.database,
  });
};
