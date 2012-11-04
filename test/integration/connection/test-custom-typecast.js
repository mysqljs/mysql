var Mysql      = require('../../../');
var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

common.useTestDb(connection);

var table = 'custom_typecast_test';
connection.query([
  'CREATE TEMPORARY TABLE `' + table + '`(',
  '`id` int(5),',
  '`val` tinyint(1)',
  ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
].join('\n'));

var results;

connection.query("INSERT INTO " + table + " VALUES (1, 0), (2, 1), (3, NULL)");
connection.query({
  sql: "SELECT * FROM " + table,
  typeCast: function (field, next) {
    if (field.type != 'TINY') {
      return next();
    }

    var val = field.string();

    if (val === null) {
      return null;
    }

    return (Number(val) > 0);
  }
}, function (err, _results) {
  if (err) throw err;

  results = _results;
});
connection.end();

process.on('exit', function() {
  assert.equal(results.length, 3);
  assert.deepEqual(results[0], {id: 1, val: false});
  assert.deepEqual(results[1], {id: 2, val: true});
  assert.deepEqual(results[2], {id: 3, val: null});
});
