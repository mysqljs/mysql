module.exports = ComPingPacket;
function ComPingPacket(sql) {
  this.command = 0x0e;
}

ComPingPacket.prototype.write = function(writer) {
  writer.writeUnsignedNumber(1, this.command);
};

ComPingPacket.prototype.parse = function(parser) {
  this.command = parser.parseUnsignedNumber(1);
};
