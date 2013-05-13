module.exports = ComStmtExecutePacket;
function ComStmtExecutePacket(statementId) {
  this.command     = 0x17;
  this.statementId = statementId;
  // the docs mention a few cursor types we could set here. I'm not sure how
  // those work so I'm using 0x00 = CURSOR_TYPE_NO_CURSOR for now.
  // see: http://dev.mysql.com/doc/internals/en/prepared-statements.html#com-stmt-execute
  this.flags = 0x00;
  // always 1 according to docs
  this.iterationCount = 1;
}

ComStmtExecutePacket.prototype.write = function(writer) {
  writer.writeUnsignedNumber(1, this.command);
  writer.writeUnsignedNumber(4, this.statementId);
  writer.writeUnsignedNumber(1, this.flags);
  writer.writeUnsignedNumber(1, this.iterationCount);
};
