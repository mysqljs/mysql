var Sequence = require('./Sequence');
var Util     = require('util');
var Packets  = require('../packets');
var Auth     = require('../Auth');

module.exports = ChangeUser;
Util.inherits(ChangeUser, Sequence);
function ChangeUser(config, callback) {
  Sequence.call(this, callback);

  this._config = config;
}

ChangeUser.prototype.start = function(handshakeInitializationPacket) {
  var scrambleBuff = handshakeInitializationPacket.scrambleBuff();
  scrambleBuff     = Auth.token(this._config.password, scrambleBuff);

  var packet = new Packets.ComChangeUserPacket({
    user          : this._config.user,
    scrambleBuff  : scrambleBuff,
    database      : this._config.database,
    charsetNumber : this._config.charsetNumber,
  });

  this._emitPacket(packet);
};

ChangeUser.prototype['ErrorPacket'] = function(packet) {
  var err = Sequence.packetToError(packet, true);
  err.fatal = true;
  this.end(err);
};
