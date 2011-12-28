var Util           = require('util');
var EventEmitter   = require('events').EventEmitter;
var Auth           = require('../Auth');
var OutgoingPacket = require('../OutgoingPacket');
var Parser         = require('../Parser');

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
  var token = Auth.token(this._password, greeting.scrambleBuffer);
  var packetSize = (
    4 + 4 + 1 + 23 +
    this._user.length + 1 +
    token.length + 1 +
    this._database.length + 1
  );
  var packet = new OutgoingPacket(packetSize, greeting.number+1);

  packet.writeNumber(4, this._flags);
  packet.writeNumber(4, this._maxPacketSize);
  packet.writeNumber(1, this._charsetNumber);
  packet.writeFiller(23);
  packet.writeNullTerminated(this._user);
  packet.writeLengthCoded(token);
  packet.writeNullTerminated(this._database);

  this.emit('packet', packet);

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
