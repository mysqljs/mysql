var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.bogusPort});

var query = connection.query('SELECT 1');

query.on('error', function (err) {
  assert.ok(err, 'got error');
  assert.equal(err.code, 'ECONNREFUSED');
  assert.equal(err.fatal, true);
});
