// An experimental fake MySQL server for tricky integration tests. Expanded
// as needed.

var _            = require('underscore');
var Net          = require('net');
var Packets      = require('../lib/protocol/packets');
var PacketWriter = require('../lib/protocol/PacketWriter');
var Parser       = require('../lib/protocol/Parser');
var Auth         = require('../lib/protocol/Auth');
var EventEmitter = require('events').EventEmitter;
var Util         = require('util');

module.exports = FakeServer;
Util.inherits(FakeServer, EventEmitter);
function FakeServer(options) {
  EventEmitter.call(this);

  this._server      = null;
  this._connections = [];
}

FakeServer.prototype.listen = function(port, cb) {
  this._server = Net.createServer(this._handleConnection.bind(this));
  this._server.listen(port, cb);
};

FakeServer.prototype._handleConnection = function(socket) {
  var connection = new FakeConnection(socket);
  this.emit('connection', connection);
  this._connections.push(connection);
};

FakeServer.prototype.destroy = function() {
  this._server.close();
  this._connections.forEach(function(connection) {
    connection.destroy();
  });
};

Util.inherits(FakeConnection, EventEmitter);
function FakeConnection(socket) {
  EventEmitter.call(this);

  this._socket = socket;
  this._parser = new Parser({onPacket: this._parsePacket.bind(this)});

  this._handshakeInitializationPacket = null;
  this._clientAuthenticationPacket    = null;
  this._oldPasswordPacket             = null;
  this._handshakeOptions              = {};

  socket.on('data', this._handleData.bind(this));
}

FakeConnection.prototype.handshake = function(options) {
  this._handshakeOptions = options || {};

  var packetOpiotns = _.extend({
    scrambleBuff1       : new Buffer('1020304050607080', 'hex'),
    scrambleBuff2       : new Buffer('0102030405060708090A0B0C', 'hex'),
    serverCapabilities1 : 512, // only 1 flag, PROTOCOL_41
    protocol41          : true
  }, this._handshakeOptions);

  this._handshakeInitializationPacket = new Packets.HandshakeInitializationPacket(packetOpiotns);

  this._sendPacket(this._handshakeInitializationPacket);
};

FakeConnection.prototype.deny = function(message, errno) {
  this._sendPacket(new Packets.ErrorPacket({
    message: message,
    errno: errno,
  }));
};

FakeConnection.prototype._sendAuthResponse = function(packet, expected) {
  var got = packet.scrambleBuff;

  if (expected.toString('hex') === got.toString('hex')) {
    this._sendPacket(new Packets.OkPacket());
  } else {
    this._sendPacket(new Packets.ErrorPacket({
      message: 'expected ' + expected.toString('hex') + ' got ' + got.toString('hex'),
      errno: 1045 // ER_ACCESS_DENIED_ERROR
    }));
  }

  this._parser.resetPacketNumber();
};

FakeConnection.prototype._sendPacket = function(packet) {
  var writer = new PacketWriter();
  packet.write(writer);
  this._socket.write(writer.toBuffer(this._parser));
};

FakeConnection.prototype._handleData = function(buffer) {
  this._parser.write(buffer);
};

FakeConnection.prototype._parsePacket = function(header) {
  var Packet   = this._determinePacket(header);
  var packet   = new Packet({protocol41: true});

  packet.parse(this._parser);

  switch (Packet) {
    case Packets.ClientAuthenticationPacket:
      this._clientAuthenticationPacket = packet;

      if (this._handshakeOptions.oldPassword) {
        this._sendPacket(new Packets.UseOldPasswordPacket());
      } else if (this._handshakeOptions.password === 'passwd') {
        var expected = new Buffer('3DA0ADA7C9E1BB3A110575DF53306F9D2DE7FD09', 'hex');
        this._sendAuthResponse(packet, expected);
      } else if (this._handshakeOptions.user || this._handshakeOptions.password) {
        throw new Error('not implemented');
      } else {
        this._sendPacket(new Packets.OkPacket());
        this._parser.resetPacketNumber();
      }
      break;
    case Packets.OldPasswordPacket:
      this._oldPasswordPacket = packet;

      var expected = Auth.scramble323(this._handshakeInitializationPacket.scrambleBuff(), this._handshakeOptions.password);

      this._sendAuthResponse(packet, expected);
      break;
    case Packets.ComQueryPacket:
      this.emit('query', packet);
      break;
    case Packets.ComQuitPacket:
      this.emit('quit', packet);
      this._socket.end();
      break;
    default:
      throw new Error('Unexpected packet: ' + Packet.name)
  }
};

FakeConnection.prototype._determinePacket = function() {
  if (!this._clientAuthenticationPacket) {
    return Packets.ClientAuthenticationPacket;
  } else if (this._handshakeOptions.oldPassword && !this._oldPasswordPacket) {
    return Packets.OldPasswordPacket;
  }

  var firstByte = this._parser.peak();
  switch (firstByte) {
    case 0x01: return Packets.ComQuitPacket;
    case 0x03: return Packets.ComQueryPacket;
    default:
      throw new Error('Unknown packet, first byte: ' + firstByte);
      break;
  }
};

FakeConnection.prototype.destroy = function() {
  this._socket.destroy();
};
