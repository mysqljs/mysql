module.exports = ComQuitPacket;
function ComQuitPacket(sql) {
}

ComQuitPacket.prototype.write = function(writer) {
  writer.writeUnsignedNumber(1, 0x01);
};
