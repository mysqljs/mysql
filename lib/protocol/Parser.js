var Util         = require('util');
module.exports = Parser;
function Parser(properties) {
  properties = properties || {};

  this._items       = [];
  this._index       = properties._index || properties.index || 0;
  this.bytesWritten = properties.bytesWritten || 0;
}

Parser.prototype.push = function(item, cb) {
  this._items = this._items.concat(item);

  if (cb) this.push(cb);
};

Parser.prototype.parse = function(buffer, offset, end) {
  var offset = offset || 0;
  var start  = offset;
  var end    = end || buffer.length;
  var index  = this._index;

  while (offset < end) {
    var item = this._items[index];
    if (!item) {
      break;
    }

    // @TODO Put try...catch here if it doesn't slow things down, otherwise
    // consider -1 return value to indicate error and then reading an error
    // property to get the error.
    // Other idea: Why not have the try...catch outside this function?
    offset = item.parse(buffer, offset, end);

    // An item not consuming all bytes offered is considered done (performance)
    var itemDone = offset < end || item.isDone();

    if (itemDone) {
      prevItem = item;
      index++;

      var nextItem = this._items[index];
      if (typeof nextItem === 'function') {
        nextItem(null, item);
        index++;
      }
    }
  }

  if (offset > end) throw new Error('unexpected buffer');

  this._index = index;
  this.bytesWritten += offset - start;

  return offset;
};
