var after      = require('after');
var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.bogusPort});

var timer = setTimeout(function () {
  throw new Error('test timeout');
}, 5000);

var done = after(2, function () {
  clearTimeout(timer);
});

connection.connect(function (err) {
  assert.ok(err, 'got connect error');
  assert.equal(err.code, 'ECONNREFUSED');
  assert.equal(err.fatal, true);
  done();
});

connection.query('SELECT 1', function (err) {
  assert.ok(err, 'got query error');
  assert.equal(err.code, 'ECONNREFUSED');
  assert.equal(err.fatal, true);
  done();
});
