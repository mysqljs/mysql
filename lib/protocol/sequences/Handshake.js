var Sequence        = require('./Sequence');
var Util            = require('util');
var Packets         = require('../packets');
var Auth            = require('../Auth');
var ClientConstants = require('../constants/client');

module.exports = Handshake;
Util.inherits(Handshake, Sequence);
function Handshake(options, callback) {
  Sequence.call(this, options, callback);

  options = options || {};

  this._config                        = options.config;
  this._handshakeInitializationPacket = null;
}

Handshake.prototype.determinePacket = function(firstByte, parser) {
  if (firstByte === 0xff) {
    return Packets.ErrorPacket;
  }

  if (!this._handshakeInitializationPacket) {
    return Packets.HandshakeInitializationPacket;
  }

  if (firstByte === 0xfe) {
    if (parser.packetLength() === 1) {
      return Packets.UseOldPasswordPacket;
    } else {
      return Packets.UseAuthSwitchPacket;
    }
  }

  return undefined;
};

Handshake.prototype['HandshakeInitializationPacket'] = function(packet) {
  this._handshakeInitializationPacket = packet;

  this._config.protocol41 = packet.protocol41;

  this._config.clientPluginAuth = packet.clientPluginAuth;

  this._config.authPluginName = packet.authPluginName;

  var serverSSLSupport = packet.serverCapabilities1 & ClientConstants.CLIENT_SSL;

  if (this._config.ssl) {
    if (!serverSSLSupport) {
      var err = new Error('Server does not support secure connection');

      err.code = 'HANDSHAKE_NO_SSL_SUPPORT';
      err.fatal = true;

      this.end(err);
      return;
    }

    this._config.clientFlags |= ClientConstants.CLIENT_SSL;
    this.emit('packet', new Packets.SSLRequestPacket({
      clientFlags   : this._config.clientFlags,
      maxPacketSize : this._config.maxPacketSize,
      charsetNumber : this._config.charsetNumber
    }));
    this.emit('start-tls');
  } else {
    this._sendCredentials();
  }
};

Handshake.prototype._tlsUpgradeCompleteHandler = function() {
  this._sendCredentials();
};

Handshake.prototype._sendCredentials = function() {
  var packet = this._handshakeInitializationPacket;
  this.emit('packet', new Packets.ClientAuthenticationPacket({
    clientFlags      : this._config.clientFlags,
    maxPacketSize    : this._config.maxPacketSize,
    charsetNumber    : this._config.charsetNumber,
    user             : this._config.user,
    database         : this._config.database,
    protocol41       : packet.protocol41,
    clientPluginAuth : this._config.clientPluginAuth,
    authPluginName   : this._config.authPluginName,
    scrambleBuff     : (packet.protocol41)
      ? Auth.token(this._config.password, packet.scrambleBuff())
      : Auth.scramble323(packet.scrambleBuff(), this._config.password)
  }));
};

Handshake.prototype['UseAuthSwitchPacket'] = function(packet) {
  if (packet.authPluginName === 'mysql_old_password' && !this._config.insecureAuth) {
    this.end(HandshakeInsecureAuthError());
    return;
  }

  try {
    var scrambleBuff = Auth.tokenByPlugin(packet.authPluginName, packet.authPluginData, this._config.password);
    this.emit('packet', new Packets.AuthSwitchPacket({
      scrambleBuff: scrambleBuff
    }));
  } catch (err) {
    this.end(err);
  }
};

Handshake.prototype['UseOldPasswordPacket'] = function() {
  if (!this._config.insecureAuth) {
    this.end(HandshakeInsecureAuthError());
    return;
  }

  this.emit('packet', new Packets.OldPasswordPacket({
    scrambleBuff: Auth.scramble323(this._handshakeInitializationPacket.scrambleBuff(), this._config.password)
  }));
};

Handshake.prototype['ErrorPacket'] = function(packet) {
  var err = this._packetToError(packet, true);
  err.fatal = true;
  this.end(err);
};

function HandshakeInsecureAuthError() {
  var err   = new Error(
    'MySQL server is requesting the old and insecure pre-4.1 auth mechanism. ' +
    'Upgrade the user password or use the {insecureAuth: true} option.'
  );

  err.code  = 'HANDSHAKE_INSECURE_AUTH';
  err.fatal = true;
  return err;
}
