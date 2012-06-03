var Sequence = require('./Sequence');
var Util     = require('util');
var Packets  = require('../packets');
var Auth     = require('../Auth');

module.exports = ChangeUser;
Util.inherits(ChangeUser, Sequence);
function ChangeUser(config, callback) {
  Sequence.call(this, callback);  
  this._config           = config;
  this._ChangeUserPacket = null;
}
/*
ChangeUser.prototype.determinePacket = function() {
  if (!this._ChangeUserPacket) {
    return Packets.ChangeUserPacket;
  }
};*/

ChangeUser.prototype.start = function() {
  var packet = new Packets.ChangeUserPacket({
    charsetNumber : this._config.charsetNumber,
    user          : this._config.user,    
    database      : this._config.database,
    password      : this._config.password,
    scrambleBuff1 : this._config.scrambleBuff1,
    scrambleBuff2 : this._config.scrambleBuff2,
  }); 
  packet.scrambleBuff  = Auth.token(this._config.password, this.scrambleBuffer());
  this._emitPacket(packet);
};

ChangeUser.prototype['ErrorPacket'] = function(packet) {
  var err = Sequence.packetToError(packet, true);
  err.fatal = true;
  this.end(err);
};

ChangeUser.prototype.scrambleBuffer = function() {
  var buffer = new Buffer(this._config.scrambleBuff1.length + this._config.scrambleBuff2.length);

  this._config.scrambleBuff1.copy(buffer);
  this._config.scrambleBuff2.copy(buffer, this._config.scrambleBuff1.length);

  return buffer;
};
