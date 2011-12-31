var Util    = require('util');
var Element = require('./Element');

/*
 * Not documented as an element in the MySql protocol, but needed for some
 * but needed for some packets. Represents a fixed size buffer (C string).
 */

module.exports = FixedSizeString;
Util.inherits(FixedSizeString, Element);
function FixedSizeString(length, value) {
  Element.call(this);

  this.length = length;
  this.value  = new Buffer(length);

  // @TODO handle value argument (could be a buffer or utf-8 string)
}

// @TODO Implement copy if we need it
