module.exports = Parser;
function Parser(properties) {
  properties = properties || {};

  this.bytesWritten = properties.bytesWritten || 0;

  this._items       = [];
  this._index       = properties._index || properties.index || 0;
}

Parser.prototype.push = function(item, cb) {
  // item can be an array of items
  this._items = this._items.concat(item);

  if (cb) this.push(cb);
};

Parser.prototype.parse = function(buffer, offset, end) {
  var offset = offset || 0;
  var end    = end || buffer.length;

  while (offset < end) {
    var item = this._items[this._index];
    if (!item) {
      break;
    }

    var newOffset = item.parse(buffer, offset, end);

    this.bytesWritten += newOffset - offset;
    offset = newOffset;

    // An item not consuming all bytes offered is considered done (performance)
    var itemDone = offset < end || item.isDone();
    if (!itemDone) {
      continue;
    }

    this._index++;

    var nextItem = this._items[this._index];
    if (typeof nextItem === 'function') {
      var prevItem = this._items[this._index - 1];
      nextItem(null, prevItem.toResult ? prevItem.toResult() : prevItem);
      this._index++;
    }
  }

  if (offset > end) throw new Error('unexpected buffer');

  return offset;
};
