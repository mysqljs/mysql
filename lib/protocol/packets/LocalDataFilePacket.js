module.exports = LocalDataFilePacket;
function LocalDataFilePacket(data) {
  this.data = data;
}

LocalDataFilePacket.prototype.write = function(writer) {
  writer.writeString(this.data);
};
