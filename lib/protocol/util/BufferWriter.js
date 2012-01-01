var BufferList    = require('./BufferList');

module.exports = BufferWriter;
function BufferWriter() {
  this.value       = undefined;
  this._bufferList = new BufferList();
}

BufferWriter.prototype.write = function(buffer, lastWrite) {
  this._bufferList.push(buffer);
  if (!lastWrite) return;

  return this.value = this._bufferList.toBuffer();
};
