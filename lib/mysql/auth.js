var Buffer = require('buffer').Buffer
  , crypto = require('crypto');

function sha1(msg) {
  var hash = crypto.createHash('sha1');
  hash.update(msg);
  // hash.digest() does not output buffers yet
  return new Buffer(hash.digest('binary'), 'binary');
};
exports.sha1 = sha1;

function xor(a, b) {
  var result = new Buffer(a.length);
  for (var i = 0; i < a.length; i++) {
    result[i] = (a[i] ^ b[i]);
  }
  return result;
};
exports.xor = xor;

exports.token = function(password, scramble) {
  var stage1 = sha1(password);
  return xor(sha1(new Buffer(scramble + sha1(stage1), 'binary')), stage1);
};