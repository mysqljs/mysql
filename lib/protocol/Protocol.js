var Parser       = require('./Parser');
var PacketWriter = require('./PacketWriter');
var Sequences    = require('./sequences');
var Packets      = require('./packets');

module.exports = Protocol;
function Protocol() {
  this._parser = new Parser({
    onPacket: this._handlePacket.bind(this),
  });

  this._receivedHandshakeInitializationPacket = false;
  this._receivedResultSetHeaderPacket         = false;
  this._receivedFieldPackets                  = false;
}

Protocol.prototype.write = function(buffer) {
  this._parser.write(buffer);
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

Protocol.prototype._handlePacket = function(header) {
  var Packet = this._determinePacket();
  var packet = new Packet();

  if (Packet === Packets.RowDataPacket) {
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
  this.onData(packetWriter.toBuffer());
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
