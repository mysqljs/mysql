var Parser    = require('./Parser');
var Sequences = require('./sequences');
var PacketWriter = require('./PacketWriter');

module.exports = Protocol;
function Protocol() {
  this._parser = new Parser({
    onPacket: this._handlePacket.bind(this),
  });
  this._sequence = undefined;
}

Protocol.prototype.write = function(buffer) {
  this._parser.write(buffer);
};

Protocol.prototype.handshake = function(config, cb) {
  this._sequence = new Sequences.Handshake({
    parser : this._parser,
    config : config,
    cb     : cb,
  });
};

Protocol.prototype._handlePacket = function(header) {
  var responsePacket = this._sequence.handlePacket();
  if (!responsePacket) {
    return;
  }

  var packetWriter = new PacketWriter(header.number + 1);
  responsePacket.write(packetWriter);

  this.onData(packetWriter.toBuffer());
};
