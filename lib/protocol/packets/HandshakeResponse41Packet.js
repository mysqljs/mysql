module.exports = HandshakeResponse41Packet;
function HandshakeResponse41Packet() {
  this.status = 0x02;
}

HandshakeResponse41Packet.prototype.parse = function write(parser) {
  this.status = parser.parseUnsignedNumber(1);
};

HandshakeResponse41Packet.prototype.write = function write(writer) {
  writer.writeUnsignedNumber(1, this.status);
};
