module.exports = ComResetConnectionPacket;

function ComResetConnectionPacket(sql) {
}

ComResetConnectionPacket.prototype.write = function write(writer) {
  writer.writeUnsignedNumber(1, 0x1f);
};
