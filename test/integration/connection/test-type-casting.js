var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

common.useTestDb(connection);

var tests = [
  {type: 'decimal(3,3)', insert: '0.330'},
  {type: 'decimal(3,3)', insert: 0.33, expect: '0.330'},
  {type: 'tinyint', insert: 1},
  {type: 'smallint', insert: 2},
  {type: 'int', insert: 3},
  {type: 'float', insert: 4.5},
  {type: 'double', insert: 5.5},
  {type: 'bigint', insert: '6'},
  {type: 'bigint', insert: 6, expect: '6'},
  {type: 'mediumint', insert: 7},
  {type: 'year', insert: 2012},
  {type: 'timestamp', insert: new Date('2012-05-12 11:00:23')},
  {type: 'datetime', insert: new Date('2012-05-12 12:00:23')},
  {type: 'date', insert: new Date('2012-05-12 00:00:00')},
  {type: 'time', insert: '13:13:23'},
  {type: 'binary(4)', insert: new Buffer([0, 1, 254, 255])},
  {type: 'varbinary(4)', insert: new Buffer([0, 1, 254, 255])},
  {type: 'tinyblob', insert: new Buffer([0, 1, 254, 255])},
  {type: 'mediumblob', insert: new Buffer([0, 1, 254, 255])},
  {type: 'longblob', insert: new Buffer([0, 1, 254, 255])},
  {type: 'blob', insert: new Buffer([0, 1, 254, 255])},
  {type: 'bit(32)', insert: new Buffer([0, 1, 254, 255])},
  {type: 'char(5)', insert: 'Hello'},
  {type: 'varchar(5)', insert: 'Hello'},
  {type: 'varchar(3) character set utf8 collate utf8_bin', insert: 'bin'},
  {type: 'tinytext', insert: 'Hello World'},
  {type: 'mediumtext', insert: 'Hello World'},
  {type: 'longtext', insert: 'Hello World'},
  {type: 'text', insert: 'Hello World'},
];

var table = 'type_casting';

var schema  = [];
var inserts = [];

tests.forEach(function(test, index) {
  var escaped = connection.escape(test.insert);

  test.columnName = test.type + '_' + index;

  schema.push('`' + test.columnName + '` ' + test.type + ',');
  inserts.push('`' + test.columnName + '` = ' + escaped);
});

var createTable = [
  'CREATE TEMPORARY TABLE `' + table + '` (',
  '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
  ].concat(schema).concat([
  'PRIMARY KEY (`id`)',
  ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
]).join('\n');

connection.query(createTable);

connection.query('INSERT INTO ' + table + ' SET' + inserts.join(',\n'));

var row;
connection.query('SELECT * FROM type_casting', function(err, rows) {
  if (err) throw err;

  row = rows[0];
});

connection.end();

process.on('exit', function() {
  tests.forEach(function(test) {
    var expected = test.expect || test.insert;
    var got      = row[test.columnName];

    if (expected instanceof Date) {
      assert.equal(got instanceof Date, true, test.type);

      expected = String(expected);
      got      = String(got);
    } else if (Buffer.isBuffer(expected)) {
      assert.equal(Buffer.isBuffer(got), true, test.type);

      expected = String(Array.prototype.slice.call(expected));
      got      = String(Array.prototype.slice.call(got));
    }

    var message =
      'got: "' + got + '" expected: "' + expected + '" test: ' + test.type + '';
    assert.strictEqual(expected, got, message);
  });
});
