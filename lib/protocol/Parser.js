var Util         = require('util');
module.exports = Parser;
function Parser() {
  this._items       = [];
  this.bytesWritten = 0;
}

Parser.prototype.push = function(item, cb) {
  this._items.push(item);

  if (cb) this.push(cb);
};

Parser.prototype.write = function(buffer, start, end) {
  var start = start || 0;
  var end   = end || buffer.length;

  while (start < end) {
    var item = this._items[0];

    if (!item) {
      if (start > end) throw new Error('unexpected buffer');

      return start;
    }

    // @TODO Put try...catch here if it doesn't slow things down
    var done = item.parse(buffer, start, end);
    start += item.bytesWritten;

    console.log(start, end, item);

    if (done) {
      prevItem = item;
      this._items.shift();

      var nextItem = this._items[0];
      if (typeof nextItem === 'function') {
        nextItem(null, item);
        this._items.shift();
      }
    }
  }

  return start;
};
