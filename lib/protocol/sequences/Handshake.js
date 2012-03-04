var Util     = require('util');
var Packets  = require('../packets');
var Password = require('../Password');
var Sequence = require('./Sequence');
var Async    = require('../../Async');

module.exports = Handshake;
Util.inherits(Handshake, Sequence);
function Handshake(properties) {
  Sequence.call(this, properties);

  this.password      = properties.password;
  this.user          = properties.user;
  this.database      = properties.database;
  this.flags         = properties.flags;
  this.maxPacketSize = properties.maxPacketSize;
  this.charsetNumber = properties.charsetNumber;

  // The scrambleBuff received in the HandshakeInitializationPacket, we need to
  // keep a reference to it since mysql could ask us to use the old
  // authentication schema in reply to our initial auth attempt.
  this._scrambleBuff = null;
}

Handshake.prototype.start = function() {
  var self = this;

  Async.waterfall([
    function(cb) {
      self._parser.push(new Packets.HandshakeInitializationPacket, cb);
    },
    function(handshakeInitializationPacket, cb) {
      self.authenticate(handshakeInitializationPacket);
      self._parser.push(new Packets.ResultPacket, cb);
    },
    function(resultPacket, cb) {
      var type             = resultPacket.type();
      var ResultPacketType = Packets[type];

      if (!ResultPacketType) {
        return cb(new Error('Handshake.NotImplemented: ' + type));
      }

      resultPacket = new ResultPacketType(resultPacket);
      self._parser.push(resultPacket, cb);
    },
    function(resultPacket, cb) {
      if (resultPacket instanceof Packets.ErrorPacket) {
        throw new Error('Handshake.AuthenticationDenied: ' + resultPacket.message.value);
        return;
      }

      if (resultPacket instanceof Packets.OkPacket) {
        self.emit('end');
        return;
      }

    }
  ], function(err) {
    if (err) self.emit('error', err);
  });
};

Handshake.prototype.authenticate = function(handshake) {
  this.emit('packet', new Packets.ClientAuthenticationPacket({
    number        : handshake.number.value + 1,
    scrambleBuff  : Password.token(this.password, handshake.scrambleBuff()),
    user          : this.user,
    databasename  : this.database,
    clientFlags   : this.flags,
    maxPacketSize : this.maxPacketSize,
    charsetNumber : this.charsetNumber,
  }));
};
