var Elements = module.exports = require('require-all')({
  dirname : __dirname,
  filter  : /([A-Z].+)\.js$/,
});

Elements.length = function(elements) {
  return elements.reduce(function(length, element) {
    return length + element.length;
  }, 0);
};

Elements.copy = function(elements, buffer, offset) {
  return elements.reduce(function(offset, element) {
    element.copy(buffer, offset);

    return offset + element.length;
  }, offset || 0);
};
