module.exports = AuthenticationSwitchResponsePacket;
function AuthenticationSwitchResponsePacket(options) {
  options = options || {};

  this.scrambleBuff = options.scrambleBuff;
}

AuthenticationSwitchResponsePacket.prototype.parse = function(parser) {
  this.scrambleBuff = parser.parsePacketTerminatedBuffer();
};

AuthenticationSwitchResponsePacket.prototype.write = function(writer) {
  writer.writeBuffer(this.scrambleBuff);
};
