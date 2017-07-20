var Sequence = require('./Sequence');
var Util     = require('util');
var Packets  = require('../packets');
var Auth     = require('../Auth');

module.exports = ChangeUser;
Util.inherits(ChangeUser, Sequence);
function ChangeUser(options, callback) {
  Sequence.call(this, options, callback);

  this._user           = options.user;
  this._password       = options.password;
  this._database       = options.database;
  this._charsetNumber  = options.charsetNumber;
  this._currentConfig  = options.currentConfig;
  this._authPluginName = options.authPluginName;
}

ChangeUser.prototype.start = function(handshakeInitializationPacket) {
  var scrambleBuff = handshakeInitializationPacket.scrambleBuff();
  scrambleBuff     = Auth.token(this._password, scrambleBuff);

  var packet = new Packets.ComChangeUserPacket({
    user             : this._user,
    scrambleBuff     : scrambleBuff,
    database         : this._database,
    charsetNumber    : this._charsetNumber,
    clientPluginAuth : this._currentConfig.clientPluginAuth,
    authPluginName   : this._authPluginName || this._currentConfig.authPluginName
  });

  this._currentConfig.user          = this._user;
  this._currentConfig.password      = this._password;
  this._currentConfig.database      = this._database;
  this._currentConfig.charsetNumber = this._charsetNumber;

  this.emit('packet', packet);
};

ChangeUser.prototype.determinePacket = function(firstByte) {
  if (firstByte === 0xff) {
    return Packets.ErrorPacket;
  }

  if (firstByte === 0xfe) {
    return Packets.UseAuthSwitchPacket;
  }

  return Packets.OkPacket;
};

ChangeUser.prototype['ErrorPacket'] = function(packet) {
  var err = this._packetToError(packet);
  err.fatal = true;
  this.end(err);
};

ChangeUser.prototype['UseAuthSwitchPacket'] = function(packet) {
  try {
    var scrambleBuff = Auth.tokenByPlugin(packet.authPluginName, packet.authPluginData, this._password);
    this.emit('packet', new Packets.AuthSwitchPacket({
      scrambleBuff: scrambleBuff
    }));
  } catch (err) {
    this.end(err);
  }
};
