module.exports = ComResetConnectionPacket;
function ComResetConnectionPacket(sql) {
  this.command = 0x1f;
}

ComResetConnectionPacket.prototype.write = function(writer) {
  writer.writeUnsignedNumber(1, this.command);
};

ComResetConnectionPacket.prototype.parse = function(parser) {
  this.command = parser.parseUnsignedNumber(1);
};
