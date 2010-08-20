var Buffer = require('buffer').Buffer,
    crypto = require('crypto');

function sha1(msg) {
  var hash = crypto.createHash('sha1');
  hash.update(msg);
  // hash.digest() does not output buffers yet
  return hash.digest('binary');
};
exports.sha1 = sha1;

function xor(a, b) {
  a = new Buffer(a, 'binary');
  b = new Buffer(b, 'binary');
  var result = new Buffer(a.length);
  for (var i = 0; i < a.length; i++) {
    result[i] = (a[i] ^ b[i]);
  }
  return result;
};
exports.xor = xor;

exports.token = function(password, scramble) {
  if (!password) {
    return new Buffer(0);
  }

  var stage1 = sha1(password);
  var stage2 = sha1(stage1);
  var stage3 = sha1(scramble.toString('binary') + stage2);
  return xor(stage3, stage1);
};
