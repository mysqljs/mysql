module.exports = AuthSwitchPacket;
function AuthSwitchPacket(options) {
  options = options || {};
  this.scrambleBuff = options.scrambleBuff;
}

AuthSwitchPacket.prototype.parse = function(parser) {
  this.scrambleBuff = parser.parsePacketTerminatedBuffer();
};

AuthSwitchPacket.prototype.write = function(writer) {
  writer.writeBuffer(this.scrambleBuff);
};
