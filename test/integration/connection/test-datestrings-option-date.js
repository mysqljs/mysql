var assert = require('assert');
var common = require('../../common');

var tests = [
  {type: 'timestamp', insert: new Date('2016-09-30 09:00:23')},
  {type: 'datetime', insert: new Date('2016-09-30 09:00:23')},
  {type: 'date', insert: '2016-09-30'}
];

var table = 'type_casting';

common.getTestConnection({dateStrings: 'date'}, function (err, connection) {
  assert.ifError(err);

  common.useTestDb(connection);

  var schema  = [];
  var inserts = [];

  tests.forEach(function(test, index) {
    var escaped = test.insertRaw || connection.escape(test.insert);

    test.columnName = test.type + '_' + index;

    schema.push(connection.escapeId(test.columnName) + ' ' + test.type + ',');
    inserts.push(connection.escapeId(test.columnName) + ' = ' + escaped);
  });

  var createTable = [
    'CREATE TEMPORARY TABLE ' + connection.escapeId(table) + ' (',
    '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,'
  ].concat(schema).concat([
    'PRIMARY KEY (`id`)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
  ]).join('\n');

  connection.query(createTable);

  connection.query('INSERT INTO ?? SET' + inserts.join(',\n'), [table]);

  connection.query('SELECT * FROM type_casting', function (err, rows) {
    assert.ifError(err);

    var row = rows[0];

    tests.forEach(function(test) {
      var expected = test.expect || test.insert;
      var got      = row[test.columnName];
      var message;

      if (expected instanceof Date) {
        assert.equal(got instanceof Date, true, test.type);

        expected = String(expected);
        got      = String(got);
      }

      if (test.deep) {
        message = 'got: "' + JSON.stringify(got) + '" expected: "' + JSON.stringify(expected) +
                  '" test: ' + test.type + '';
        assert.deepEqual(expected, got, message);
      } else {
        message = 'got: "' + got + '" (' + (typeof got) + ') expected: "' + expected +
                  '" (' + (typeof expected) + ') test: ' + test.type + '';
        assert.strictEqual(expected, got, message);
      }
    });

    connection.end(assert.ifError);
  });
});
