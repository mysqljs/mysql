var Parser       = require('./Parser');
var PacketWriter = require('./PacketWriter');
var Packets      = require('./packets');
var Auth         = require('./Auth');
var Stream       = require('stream').Stream;
var Util         = require('util');

module.exports = Protocol;
Util.inherits(Protocol, Stream);
function Protocol(options) {
  Stream.call(this);

  options = options || {};

  this.readable = true;
  this.writable = true;

  this._parser = options.parser || new Parser({
    onPacket: this._handlePacket.bind(this),
  });

  this._config   = null;
  this._callback = null;

  this._handshakeInitializationPacket = null;
  this._resultSetHeaderPacket         = null;
  this._fields                        = [];
  this._rows                          = [];
  this._eofPackets                    = [];
}

Protocol.prototype.write = function(buffer) {
  // @TODO Try..catch and handle errors
  this._parser.write(buffer);
  return true;
};

Protocol.prototype.handshake = function(config, cb) {
  this._config   = config;
  this._callback = cb;
};

Protocol.prototype.query = function(options, cb) {
  this._emitPacket(new Packets.ComQueryPacket(options.sql));

  this._resultSetHeaderPacket = null;
  this._fields                = [];
  this._rows                  = [];
  this._eofPackets            = [];
  this._callback              = cb;
};

Protocol.prototype._determinePacket = function() {
  if (!this._handshakeInitializationPacket) {
    return Packets.HandshakeInitializationPacket;
  }

  var byte = this._parser.peak();

  switch (byte) {
    case 0x00: return Packets.OkPacket;
    case 0xfe: return Packets.EofPacket;
    case 0xff: return Packets.ErrorPacket;
    default:
      if (!this._resultSetHeaderPacket) return Packets.ResultSetHeaderPacket;

      return (this._eofPackets.length === 0)
        ? Packets.FieldPacket
        : Packets.RowDataPacket;
  }

  throw new Error('Unknown packet');
};

Protocol.prototype._handlePacket = function(header) {
  var Packet = this._determinePacket();
  var packet = new Packet();

  packet.parse(this._parser, this._fields);

  switch (Packet) {
    case Packets.HandshakeInitializationPacket:
      this._handshakeInitializationPacket = packet;

      this._emitPacket(new Packets.ClientAuthenticationPacket({
        clientFlags   : this._config.clientFlags,
        maxPacketSize : this._config.maxPacketSize,
        charsetNumber : this._config.charsetNumber,
        user          : this._config.user,
        scrambleBuff  : Auth.token(this._config.password, packet.scrambleBuff()),
        database      : this._config.database,
      }), header.number + 1);
      break;
    case Packets.OkPacket:
      this._finishSequence(null, packet);
      break;
    case Packets.ResultSetHeaderPacket:
      this._resultSetHeaderPacket = packet;
      break;
    case Packets.FieldPacket:
      this._fields.push(packet);
      break;
    case Packets.RowDataPacket:
      this._rows.push(packet);
      break;
    case Packets.EofPacket:
      this._eofPackets.push(packet);
      if (this._eofPackets.length === 2) {
        this._finishSequence(null, this._rows);
      }
      break;
  }
};

Protocol.prototype._finishSequence = function(err, result) {
  var callback = this._callback;
  this._callback = null;

  if (callback) {
    callback(err, result);
  } else if (err) {
    this.emit('error', err);
  }

  // @TODO Emit end event for query
};

Protocol.prototype._emitPacket = function(packet, number) {
  var packetWriter = new PacketWriter(number);
  packet.write(packetWriter);
  this.emit('data', packetWriter.toBuffer());
};

Protocol.prototype.destroy = function() {
  this._parser = null;
};
