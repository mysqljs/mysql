module.exports = OldPasswordPacket;
function OldPasswordPacket(options) {
  options = options || {};

  this.scrambleBuff = options.scrambleBuff;
}

OldPasswordPacket.prototype.parse = function(parser) {
  this.scrambleBuff = parser.parsePacketTerminatedBuffer();
};

OldPasswordPacket.prototype.write = function(writer) {
  writer.writeBuffer(this.scrambleBuff);
};
