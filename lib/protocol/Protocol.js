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
  var packet = this._parser.parse(this._determinePacket());

  var result = this._sequence.handlePacket(packet);
  if (!result) {
    return;
  }

  if (result === true) {
    console.log(this._sequence, result);
    this._sequence = null;
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
      return Packets.EofPacket;
    case 0xff:
      return Packets.ErrorPacket;
    default:
      if (!this._receivedResultSetHeaderPacket) {
        this._receivedResultSetHeaderPacket = true;
        return Packets.ResultSetHeaderPacket;
      }

      return Packets.FieldPacket;
  }

  throw new Error('Unknown packet');
};
