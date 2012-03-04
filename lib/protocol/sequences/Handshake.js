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
}

Handshake.prototype.start = function() {
  var self = this;

  Async.waterfall([
    this._parseInitializationPacket.bind(this),
    this._handleInitializationPacket.bind(this),
    this._interpretResultPacket.bind(this),
    this._handleResultPacket.bind(this),
  ], function(err) {
    if (err) self.emit('error', err);
  });
};

Handshake.prototype._parseInitializationPacket = function(cb) {
  this._parser.push(new Packets.HandshakeInitializationPacket, cb);
};

Handshake.prototype._handleInitializationPacket = function(packet, cb) {
  this.emit('packet', new Packets.ClientAuthenticationPacket({
    number        : packet.number.value + 1,
    scrambleBuff  : Password.token(this.password, packet.scrambleBuff()),
    user          : this.user,
    databasename  : this.database,
    clientFlags   : this.flags,
    maxPacketSize : this.maxPacketSize,
    charsetNumber : this.charsetNumber,
  }));

  this._parser.push(new Packets.ResultPacket, cb);

  // @TODO Handle old auth
};

Handshake.prototype._interpretResultPacket = function(packet, cb) {
  var type             = packet.type();
  var ResultPacketType = Packets[type];

  if (!ResultPacketType) {
    return cb(new Error('Handshake.NotImplemented: ' + type));
  }

  this._parser.push(new ResultPacketType(packet), cb);
};

Handshake.prototype._handleResultPacket = function(packet, cb) {
  if (packet instanceof Packets.ErrorPacket) {
    throw new Error('Handshake.AuthenticationDenied: ' + packet.message.value);
    return;
  }

  if (packet instanceof Packets.OkPacket) {
    this.emit('end');
    return;
  }

  throw new Error('whuut?');
};
