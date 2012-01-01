var StringDecoder = require('string_decoder').StringDecoder;

module.exports = StringWriter;
function StringWriter(encoding) {
  this.value    = '';
  this._decoder = new StringDecoder(encoding);
}

StringWriter.prototype.write = function(buffer, lastWrite) {
  return this.value += this._decoder.write(buffer);
};
