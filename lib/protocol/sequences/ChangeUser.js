var Handshake = require('./Handshake');
var Util      = require('util');
var Packets   = require('../packets');
var Auth      = require('../Auth');

function createHandshakeOptions(options) {
  var config        = {};
  var currentConfig = options.currentConfig;
  var configKeys    = Object.keys(currentConfig);

  for (var i = 0; i < configKeys.length; i++) {
    var key = configKeys[i];
    config[key] = currentConfig[key];
  }

  config.user          = options.user;
  config.password      = options.password;
  config.database      = options.database;
  config.charsetNumber = options.charsetNumber;

  return {
    config  : config,
    timeout : options.timeout
  };
}

module.exports = ChangeUser;
Util.inherits(ChangeUser, Handshake);
function ChangeUser(options, callback) {
  Handshake.call(this, createHandshakeOptions(options), callback);

  this._user                          = options.user;
  this._password                      = options.password;
  this._database                      = options.database;
  this._charsetNumber                 = options.charsetNumber;
  this._currentConfig                 = options.currentConfig;
  this._handshakeInitializationPacket = null;
}

ChangeUser.prototype.determinePacket = function determinePacket(firstByte) {
  switch (firstByte) {
    case 0xfe: return Packets.AuthSwitchRequestPacket;
    case 0xff: return Packets.ErrorPacket;
    default: return undefined;
  }
};

ChangeUser.prototype.start = function(handshakeInitializationPacket) {
  this._handshakeInitializationPacket = handshakeInitializationPacket;

  var scrambleBuff = this._handshakeInitializationPacket.scrambleBuff();

  if (this._handshakeInitializationPacket.pluginData === 'caching_sha2_password') {
    scrambleBuff = Auth.sha2Token(this._password, scrambleBuff);
  } else if (this._handshakeInitializationPacket.pluginData === 'mysql_native_password') {
    scrambleBuff = Auth.token(this._password, scrambleBuff);
  } else {
    scrambleBuff = Auth.scramble323(scrambleBuff, this._password);
  }

  var packet = new Packets.ComChangeUserPacket({
    user          : this._user,
    scrambleBuff  : scrambleBuff,
    database      : this._database,
    charsetNumber : this._charsetNumber,
    authPlugin    : this._currentConfig.pluginData
  });

  this._currentConfig.user          = this._user;
  this._currentConfig.password      = this._password;
  this._currentConfig.database      = this._database;
  this._currentConfig.charsetNumber = this._charsetNumber;

  this.emit('packet', packet);
};

ChangeUser.prototype['AuthSwitchRequestPacket'] = function (packet) {
  var name = packet.authMethodName;
  var data = Auth.auth(name, packet.authMethodData, {
    password: this._password
  });

  if (data !== undefined) {
    this.emit('packet', new Packets.AuthSwitchResponsePacket({
      data: data
    }));
  } else {
    var err   = new Error('MySQL is requesting the ' + name + ' authentication method, which is not supported.');
    err.code  = 'UNSUPPORTED_AUTH_METHOD';
    err.fatal = true;
    this.end(err);
  }
};

ChangeUser.prototype['ErrorPacket'] = function(packet) {
  var err = this._packetToError(packet);
  err.fatal = true;
  this.end(err);
};
