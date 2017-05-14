module.exports = AuthSwitchResponsePacket;
function AuthSwitchResponsePacket(options) {
  options = options || {};

  this.data = options.data;
}

AuthSwitchResponsePacket.prototype.parse = function parse(parser) {
  this.data = parser.parsePacketTerminatedBuffer();
};

AuthSwitchResponsePacket.prototype.write = function write(writer) {
  writer.writeBuffer(this.data);
};
