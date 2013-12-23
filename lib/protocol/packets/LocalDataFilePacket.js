module.exports = LocalDataFilePacket;
/**
 * @param {Buffer} data
 */
function LocalDataFilePacket(data) {
  this.data = data;
}

LocalDataFilePacket.prototype.write = function(writer) {
  writer.writeBuffer(this.data);
};
