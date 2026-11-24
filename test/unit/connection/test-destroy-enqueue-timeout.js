var assert = require('assert');
var common = require('../../common');

var connection = common.createConnection({port: common.bogusPort});
var destroyed = false;

connection.on('enqueue', function () {
  connection.destroy();
  destroyed = true;
});

connection.connect({timeout: 1000}, function () {
  throw new Error('Unexpected connect callback after destroy');
});

process.on('exit', function () {
  assert.ok(destroyed);
});
