var common     = require('../common');
var connection = common.createConnection();
var assert     = require('assert');

connection.connect();
connection.query('CREATE DATABASE ' + common.testDatabase, function(err) {
  if (err && err.code !== 'ER_DB_CREATE_EXISTS') throw err;
});

connection.query('USE ' + common.testDatabase);

var expected = {
  'DECIMAL'   : '0.330',
  'TINYINT'   : 1,
  'SMALLINT'  : 2,
  'INT'       : 3,
  'FLOAT'     : 4.5,
  'DOUBLE'    : 5.5,
  'BIGINT'    : '6',
  'MEDIUMINT' : 7,
  'YEAR'      : 2012,
  'TIMESTAMP' : new Date('2012-05-12 11:00:23'),
  'DATETIME'  : new Date('2012-05-12 11:02:32'),
  'DATE'      : new Date('2012-05-12'),
  'TIME'      : '13:13:23',
};

var schema  = [];
var inserts = [];
for (var key in expected) {
  var value = expected[key];
  var type = key;
  if (type === 'DECIMAL') {
    type = type + '(3,3)';
  }

  schema.push('`' + key + '` ' + type + ',');
  inserts.push('`' + key + '` = ' + connection.escape(value));
}

connection.query([
  'CREATE TEMPORARY TABLE `type_casting` (',
  '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
  ].concat(schema).concat([
  'PRIMARY KEY (`id`)',
  ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
]).join('\n'));

connection.query('INSERT INTO type_casting SET' + inserts.join(',\n'));

var row;
connection.query('SELECT * FROM type_casting', function(err, rows) {
  if (err) throw err;

  row = rows[0];
});

connection.end();

process.on('exit', function() {
  for (var key in expected) {
    var expectedValue = expected[key];
    var actualValue   = row[key];

    if (expectedValue instanceof Date) {
      expectedValue = Number(expectedValue);
      actualValue = Number(actualValue);
    }

    assert.strictEqual(actualValue, expectedValue, key + ': ' + actualValue + ' !== ' + expectedValue);
  }
});
