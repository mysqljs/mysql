var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.bogusPort});

var timer = setTimeout(function () {
  throw new Error('test timeout');
}, 5000);

connection.connect();
connection.query('SELECT 1');

connection.on('error', function (err) {
  assert.ok(err, 'got connect error');
  assert.equal(err.code, 'ECONNREFUSED');
  assert.equal(err.fatal, true);
  clearTimeout(timer);
});
