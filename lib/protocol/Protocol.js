var Parser       = require('./Parser');
var PacketWriter = require('./PacketWriter');
var Sequences    = require('./sequences');
var Packets      = require('./packets');
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

  this._receivedHandshakeInitializationPacket = false;
  this._receivedResultSetHeaderPacket         = false;
  this._receivedFieldPackets                  = false;
}

Protocol.prototype.write = function(buffer) {
  this._parser.write(buffer);
  return true;
};

Protocol.prototype.handshake = function(config, cb) {
  this._sequence = new Sequences.Handshake(config, cb);
};

Protocol.prototype.query = function(options, cb) {
  this._sequence = new Sequences.Query(options, cb);

  this._writePacket(new Packets.ComQueryPacket(options.sql));

  this._receivedResultSetHeaderPacket = false;
  this._receivedFieldPackets          = false;
};

Protocol.prototype.destroy = function() {
  this._parser = null;
};

Protocol.prototype._handlePacket = function(header) {
  var Packet = this._determinePacket();
  var packet = new Packet();

  if (Packet === Packets.RowDataPacket) {
    // @TODO ugly
    packet.parse(this._parser, this._sequence._fieldPackets);
  } else {
    packet.parse(this._parser);
  }

  var result = this._sequence.handlePacket(packet, this._parser);
  if (!result) {
    return;
  }

  this._writePacket(result, header.number + 1);
};

Protocol.prototype._writePacket = function(packet, number) {
  var packetWriter = new PacketWriter(number);
  packet.write(packetWriter);
  this.emit('data', packetWriter.toBuffer());
};

Protocol.prototype._determinePacket = function() {
  if (!this._receivedHandshakeInitializationPacket) {
    this._receivedHandshakeInitializationPacket = true;
    return Packets.HandshakeInitializationPacket;
  }

  var byte = this._parser.peak();

  switch (byte) {
    case 0x00:
      return Packets.OkPacket;
    case 0xfe:
      if (!this._receivedFieldPackets) {
        this._receivedFieldPackets = true;
      }

      return Packets.EofPacket;
    case 0xff:
      return Packets.ErrorPacket;
    default:
      if (!this._receivedResultSetHeaderPacket) {
        this._receivedResultSetHeaderPacket = true;
        return Packets.ResultSetHeaderPacket;
      }

      if (!this._receivedFieldPackets) {
        return Packets.FieldPacket;
      }

      return Packets.RowDataPacket;
  }

  throw new Error('Unknown packet');
};
