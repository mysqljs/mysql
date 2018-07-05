module.exports = ClearTextPasswordPacket;
function ClearTextPasswordPacket(options) {
  this.data = options.data;
}

ClearTextPasswordPacket.prototype.write = function write(writer) {
  writer.writeNullTerminatedString(this.data);
};
