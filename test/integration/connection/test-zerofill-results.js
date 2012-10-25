var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

common.useTestDb(connection);

var table = 'zerofill_results_test';
connection.query([
  'CREATE TEMPORARY TABLE `' + table + '` (',
  '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
  '`num` int(5) UNSIGNED ZEROFILL,',
  'PRIMARY KEY (`id`)',
  ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
].join('\n'));

var test_numbers = [ "00000", "00001", "00012", "00123", "01234", "12345", null ];
var results = {};

for (var i = 0; i < test_numbers.length; i++) {
  connection.query('INSERT INTO ' + table + ' SET ?', {
    id: (i + 1),
    num: (test_numbers[i] !== null ? parseInt(test_numbers[i], 10) : null)
  }, function (err, _result) {
    if (err) throw err;
  });
}
connection.query('SELECT * FROM ' + table, function (err, _results) {
  if (err) throw err;

  results = _results;
});
connection.end();

process.on('exit', function() {
  assert.strictEqual(results.length, test_numbers.length);
  for (var i = 0; i < results.length; i++) {
    assert.strictEqual(test_numbers[results[i].id - 1], (results[i].num !== null ? "" + results[i].num : null));
  }
});
