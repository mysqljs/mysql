module.exports = FastAuthSuccessPacket;
function FastAuthSuccessPacket() {
  this.status         = 0x01;
  this.authMethodName = 0x03;
}

FastAuthSuccessPacket.prototype.parse = function parse(parser) {
  this.status         = parser.parseUnsignedNumber(1);
  this.authMethodName = parser.parseUnsignedNumber(1);
};

FastAuthSuccessPacket.prototype.write = function write(writer) {
  writer.writeUnsignedNumber(1, this.status);
  writer.writeUnsignedNumber(1, this.authMethodName);
};
