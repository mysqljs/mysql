
module.exports = BufferList;
function BufferList() {
  this.bufs = [];
  this.size = 0;
}

BufferList.prototype.shift = function shift() {
  var buf = this.bufs.shift();

  if (buf) {
    this.size -= buf.length;
  }

  return buf;
};

BufferList.prototype.push = function push(buf) {
  if (!buf || !buf.length) {
    return;
  }

  this.bufs.push(buf);
  this.size += buf.length;
};
