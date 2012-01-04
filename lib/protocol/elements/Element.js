var Util = require('util');

module.exports = Element;
function Element() {
  // @TODO set this to this.length when setting the element value
  this.bytesWritten = 0;
}

// Copies the given element to `buffer`, starting at `offset` (in buffer).
Element.prototype.copy = function(buffer, offset) {
  throw new Error('Element.IncompleteInterface: All Elements must implement #copy.');
};

// Fills the given element with a slice from `buffer` (start to end)
// Returns `true` if the element was filled, otherwise `false`.
// Element#bytesWritten indicates how many bytes of the buffer were used.
Element.prototype.write = function(buffer, start, end) {
  throw new Error('Element.IncompleteInterface: All Elements must implement #write.');
};

Element.prototype.inspect = function() {
  if (this.bytesWritten === this.length) return Util.inspect(this.value);


  if (this.bytesWritten) 'partial (' + this.bytesWritten + ' byte)'
  if (this.bytesWritten === 0) return 'undefined';
  return 'partial (' + this.value + ')';
};
