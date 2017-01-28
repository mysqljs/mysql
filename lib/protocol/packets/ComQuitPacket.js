module.exports = ComQuitPacket;
function ComQuitPacket() {
  this.command = 0x01;
}

ComQuitPacket.prototype.parse = function parse(parser) {
  this.command = parser.parseUnsignedNumber(1);
};

ComQuitPacket.prototype.write = function write(writer) {
  writer.writeUnsignedNumber(1, this.command);
};
