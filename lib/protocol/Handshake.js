var Util                 = require('util');
var EventEmitter         = require('events').EventEmitter;
var Parser               = require('../Parser');
var AuthenticationPacket = require('./AuthenticationPacket');

module.exports = Handshake;
Util.inherits(Handshake, EventEmitter);
function Handshake(properties) {
  EventEmitter.call(this);

  this._password      = properties.password;
  this._user          = properties.user;
  this._database      = properties.database;
  this._flags         = properties.flags;
  this._maxPacketSize = properties.maxPacketSize;
  this._charsetNumber = properties.charsetNumber;

  this._greeting = null;
}

Handshake.prototype.handlePacket = function(packet) {
  if (packet.type == Parser.GREETING_PACKET) {
    this.sendAuth(packet);
    return;
  }

  if (packet.type == Parser.USE_OLD_PASSWORD_PROTOCOL_PACKET) {
    this.sendOldAuth();
    return;
  }

  if (packet.type != Parser.ERROR_PACKET) {
    this.emit('end');
    return;
  }

  this.emit('error', packet);
};

Handshake.prototype.sendAuth = function(greeting) {
  this.emit('packet', new AuthenticationPacket({
    number         : greeting.number,
    scrambleBuffer : greeting.scrambleBuffer,
    password       : this._password,
    user           : this._user,
    database       : this._database,
    flags          : this._flags,
    maxPacketSize  : this._maxPacketSize,
    charsetNumber  : this._charsetNumber,
  }));

  // Keep a reference to the greeting packet. We might receive a
  // USE_OLD_PASSWORD_PROTOCOL_PACKET as a response, in which case we will need
  // the greeting packet again. See _sendOldAuth()
  this._greeting = greeting;
};

Handshake.prototype.sendOldAuth = function() {
  var token = Auth.scramble323(greeting.scrambleBuffer, this.password);
  var packetSize = (
    token.length + 1
  );
  var packet = new OutgoingPacket(packetSize, greeting.number+3);

  // I could not find any official documentation for this, but from sniffing
  // the mysql command line client, I think this is the right way to send the
  // scrambled token after receiving the USE_OLD_PASSWORD_PROTOCOL_PACKET.
  packet.write(token);
  packet.writeFiller(1);

  this.emit('packet', packet);
};
