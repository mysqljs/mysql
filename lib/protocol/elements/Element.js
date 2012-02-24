var _    = require('underscore');
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
Element.prototype.parse = function(buffer, start, end) {
  throw new Error('Element.IncompleteInterface: All Elements must implement #parse.');
};

Element.prototype.isDone = function() {
  return this.bytesWritten === this.length;
};

Element.prototype.inspect = function() {
  var properties = {};
  for (var key in this) {
    if (this.hasOwnProperty(key)) {
      properties[key] = this[key];
    }
  }
  return '<' + this.constructor.name  + ' ' + Util.inspect(properties) + '>';
};
