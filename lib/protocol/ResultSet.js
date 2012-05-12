module.exports = ResultSet;
function ResultSet() {
  this.resultSetHeaderPacket = null;
  this.fieldPackets          = [];
  this.eofPackets            = [];
  this.rows                  = [];
}
