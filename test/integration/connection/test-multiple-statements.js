var common     = require('../../common');
var ResultSet     = require('../../../lib/protocol/ResultSet');
var connection = common.createConnection({multipleStatements: true});
var assert     = require('assert');

var sql = [
  'SELECT 1',
  'USE ' + common.testDatabase,
  'SELECT 2',
].join('; ');

var results;
var fields;
connection.query(sql, function(err, _results0, _results1) {
  if (err) throw err;

  results0 = _results0;
  results1 = _results1;
  args = Array.prototype.slice.call(arguments);
});

connection.end();

process.on('exit', function() {

  var rs0 = new ResultSet();
  rs0.push({1: 1});
  var rs1 = new ResultSet();
  rs1.push({2: 2});

  assert.equal(args.length, 3);
  assert.deepEqual(results0, rs0);
  assert(results0.serverInfo);
  assert(results1.serverInfo);
  assert.strictEqual(results0.serverInfo.constructor.name, 'OkPacket');
  assert.strictEqual(results1.serverInfo.constructor.name, 'OkPacket');
  assert.deepEqual(results0.serverInfo, results1.serverInfo);
  assert.deepEqual(results1, rs1);

  assert.equal(results0.columns[0].name, '1');
  assert.equal(results1.columns[0].name, '2');
});
