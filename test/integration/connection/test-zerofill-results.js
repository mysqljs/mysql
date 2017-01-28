var assert = require('assert');
var common = require('../../common');

var table = 'zerofill_results_test';

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  common.useTestDb(connection);

  connection.query([
    'CREATE TEMPORARY TABLE ?? (',
    '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
    '`num` int(5) UNSIGNED ZEROFILL,',
    'PRIMARY KEY (`id`)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
  ].join('\n'), [table], assert.ifError);

  var test_numbers = ['00000', '00001', '00012', '00123', '01234', '12345', null];

  for (var i = 0; i < test_numbers.length; i++) {
    connection.query('INSERT INTO ?? SET ?', [table, {
      id  : (i + 1),
      num : (test_numbers[i] !== null ? parseInt(test_numbers[i], 10) : null)
    }], assert.ifError);
  }

  connection.query('SELECT * FROM ??', [table], function (err, results) {
    assert.ifError(err);
    assert.strictEqual(results.length, test_numbers.length);

    for (var i = 0; i < results.length; i++) {
      assert.strictEqual(test_numbers[results[i].id - 1], (results[i].num !== null ? '' + results[i].num : null));
    }

    connection.end(assert.ifError);
  });
});
