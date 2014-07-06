var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.bogusPort});

connection.connect(function (err) {
  assert.ok(err, 'got error');
  assert.ok(err.stack.indexOf(__filename) > 0);
});
