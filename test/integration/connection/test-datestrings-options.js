var assert = require('assert');
var common = require('../../common');

var truthyOptionsArray = [1, 5, true, 'yes'];
var falsyOptionsArray = [0, false, undefined];
var dateOptionsArray = ['date', 'DATE', 'Date'];

var truthyOptionTests = [
  {type: 'timestamp', insert: '2016-09-30 09:00:23'},
  {type: 'datetime', insert: '2016-09-30 09:00:23'},
  {type: 'date', insert: '2016-09-30'}
];

var falsyOptionTests = [
  {type: 'timestamp', insert: new Date('2016-09-30 09:00:23')},
  {type: 'datetime', insert: new Date('2016-09-30 09:00:23')},
  {type: 'date', insert: new Date('2016-09-30 00:00:00')}
];

var dateOptionTests = [
  {type: 'timestamp', insert: new Date('2016-09-30 09:00:23')},
  {type: 'datetime', insert: new Date('2016-09-30 09:00:23')},
  {type: 'date', insert: '2016-09-30'}
];

for(i=0; i<truthyOptionsArray.length; i++){
  dateStringsOptionTest(truthyOptionsArray[i], truthyOptionTests);
}

for(i=0; i<falsyOptionsArray.length; i++){
  dateStringsOptionTest(falsyOptionsArray[i], falsyOptionTests);
}

for(i=0; i<dateOptionsArray.length; i++){
  dateStringsOptionTest(dateOptionsArray[i], dateOptionTests);
}

function dateStringsOptionTest(dateStringsOption, tests) {
    

  var table = 'type_casting';

  common.getTestConnection({dateStrings: dateStringsOption}, function (err, connection) {
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

        message = 'dateStrings: ' + JSON.stringify(dateStringsOption) + ' got: "' + got + '" (' + (typeof got) + ') expected: "' + expected +
                  '" (' + (typeof expected) + ') test: ' + test.type + '';
        assert.strictEqual(expected, got, message);
      });

      connection.end(assert.ifError);
    });
  });
}