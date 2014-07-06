var Sequence = require('./Sequence');
var Util     = require('util');
var Packets  = require('../packets');
var Auth     = require('../Auth');

module.exports = ChangeUser;
Util.inherits(ChangeUser, Sequence);
function ChangeUser(options, callback) {
  Sequence.call(this, options, callback);

  this._user          = options.user;
  this._password      = options.password;
  this._database      = options.database;
  this._charsetNumber = options.charsetNumber;
  this._currentConfig = options.currentConfig;
}

ChangeUser.prototype.start = function(handshakeInitializationPacket) {
  var scrambleBuff = handshakeInitializationPacket.scrambleBuff();
  scrambleBuff     = Auth.token(this._password, scrambleBuff);

  var packet = new Packets.ComChangeUserPacket({
    user          : this._user,
    scrambleBuff  : scrambleBuff,
    database      : this._database,
    charsetNumber : this._charsetNumber,
  });

  this._currentConfig.user          = this._user;
  this._currentConfig.password      = this._password;
  this._currentConfig.database      = this._database;
  this._currentConfig.charsetNumber = this._charsetNumber;

  this.emit('packet', packet);
};

ChangeUser.prototype['ErrorPacket'] = function(packet) {
  var err = this._packetToError(packet);
  err.fatal = true;
  this.end(err);
};
