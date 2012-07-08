// An experimental fake MySQL server for tricky integration tests. Expanded
// as needed.

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

  this._handshakeInitializationPacket = new Packets.HandshakeInitializationPacket({
    scrambleBuff1: new Buffer(8),
    scrambleBuff2: new Buffer(12),
  });

  this._sendPacket(this._handshakeInitializationPacket);
};

FakeConnection.prototype.deny = function(message, errno) {
  this._sendPacket(new Packets.ErrorPacket({
    message: message,
    errno: errno,
  }));
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
  var packet   = new Packet();

  packet.parse(this._parser);

  switch (Packet) {
    case Packets.ClientAuthenticationPacket:
      this._clientAuthenticationPacket = packet;

      if (this._handshakeOptions.oldPassword) {
        this._sendPacket(new Packets.UseOldPasswordPacket());
      } else {
        if (this._handshakeOptions.user || this._handshakeOptions.password) {
          throw new Error('not implemented');
        }

        this._sendPacket(new Packets.OkPacket());
        this._parser.resetPacketNumber();
      }
      break;
    case Packets.OldPasswordPacket:
      this._oldPasswordPacket = packet;

      var expected = Auth.scramble323(this._handshakeInitializationPacket.scrambleBuff(), this._handshakeOptions.password);
      var got      = packet.scrambleBuff;

      var toString = function(buffer) {
        return Array.prototype.slice.call(buffer).join(',');
      };

      if (toString(expected) === toString(got)) {
        this._sendPacket(new Packets.OkPacket());
      } else {
        this._sendPacket(new Packets.ErrorPacket());
      }

      this._parser.resetPacketNumber();
      break;
    case Packets.ComQueryPacket:
      this.emit('query', packet);
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
    case 0x03: return Packets.ComQueryPacket;
    default:
      throw new Error('Unknown packet, first byte: ' + firstByte);
      break;
  }
};

FakeConnection.prototype.destroy = function() {
  this._socket.destroy();
};
