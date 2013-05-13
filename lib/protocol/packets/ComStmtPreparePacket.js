module.exports = ComStmtPreparePacket;
function ComStmtPreparePacket(sql) {
  this.command = 0x16;
  this.sql     = sql;
}

ComStmtPreparePacket.prototype.write = function(writer) {
  writer.writeUnsignedNumber(1, this.command);
  writer.writeString(this.sql);
};
