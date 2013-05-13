module.exports = StmtPrepareOkPacket;
function StmtPrepareOkPacket(options) {
  options = options || {};

  this.status         = undefined;
  this.statementId    = undefined;
  this.numColumns     = undefined;
  this.numParams      = undefined;
  this.filler         = undefined;
  this.warningCount   = undefined;
  this.paramDefBlock  = undefined;
  this.columnDefBlock = undefined;
}

StmtPrepareOkPacket.prototype.parse = function(parser) {
  this.status       = parser.parseUnsignedNumber(1);
  this.statementId  = parser.parseUnsignedNumber(4);
  this.numColumns   = parser.parseUnsignedNumber(2);
  this.numParams    = parser.parseUnsignedNumber(2);
  this.filler       = parser.parseFiller(1);
  this.warningCount = parser.parseUnsignedNumber(2);
};
