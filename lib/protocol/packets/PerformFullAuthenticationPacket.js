module.exports = PerformFullAuthenticationPacket;
function PerformFullAuthenticationPacket() {
  this.status         = 0x01;
  this.authMethodName = 0x04;
}

PerformFullAuthenticationPacket.prototype.parse = function parse(parser) {
  this.status         = parser.parseUnsignedNumber(1);
  this.authMethodName = parser.parseUnsignedNumber(1);
};

PerformFullAuthenticationPacket.prototype.write = function write(writer) {
  writer.writeUnsignedNumber(1, this.status);
  writer.writeUnsignedNumber(1, this.authMethodName);
};
