var common     = require('../../common');
var connection = common.createConnection({multipleStatements: true});
var assert     = require('assert');

var sql = [
  'SELECT 1',
  'USE ' + common.testDatabase,
  'SELECT 2',
  'invalid sql',
  'SELECT 3',
].join('; ');

var results = [];
var fields = [];
var hadErr   = false;

var query = connection.query(sql);
query
  .on('error', function(err) {
    assert.equal(hadErr, false);
    hadErr = true;

    assert.equal(err.code, 'ER_PARSE_ERROR');
    assert.equal(err.index, 3);
  })
  .on('fields', function(_fields, index) {
    fields.push({fields: _fields, index: index});
  })
  .on('result', function(result, index) {
    results.push({result: result, index: index});
  });

connection.end();

process.on('exit', function() {
  assert.ok(hadErr);

  assert.equal(results.length, 3);

  assert.deepEqual(results[0].result, {1: 1});
  assert.equal(results[0].index, 0);

  assert.equal(results[1].result.constructor.name, 'OkPacket');
  assert.equal(results[1].index, 1);

  assert.deepEqual(results[2].result, {2: 2});
  assert.equal(results[2].index, 2);

  assert.equal(fields.length, 2);
  assert.equal(fields[0].fields[0].name, '1');
  assert.equal(fields[1].fields[0].name, '2');

  assert.equal(fields[0].index, 0);
  assert.equal(fields[1].index, 2);
});
