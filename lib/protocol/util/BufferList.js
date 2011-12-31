module.exports = BufferList;
function BufferList() {
  this.buffers = [];
  this.length  = 0;
}

BufferList.prototype.push = function(buffer) {
  this.buffers.push(buffer);
  this.length += buffer.length;
};

BufferList.prototype.toBuffer = function() {
  if (this.buffers.length === 1) return this.buffers[0];

  var combinedBuffer = new Buffer(this.length);
  var offset         = 0;

  this.buffers.forEach(function(buffer) {
    buffer.copy(combinedBuffer, offset);
    offset += buffer.length;
  });

  return combinedBuffer;
};
