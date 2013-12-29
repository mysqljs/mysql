var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

var sql = 'SELECT 1';

var gotEnd = false;
var gotClose = false;

var query = connection.query(sql);
var stream = query.stream()

stream.on('end', function () {
  gotEnd = true
})

stream.on('close', function () {
  gotClose = true
})

connection.end()

process.on('exit', function () {
  assert.ok(!gotEnd, '"end" event not emitted')
  assert.ok(gotClose, '"close" event was emitted')
})
