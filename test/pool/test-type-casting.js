var common     = require('../common');
var Pool       = require('../../lib/Pool');
var pool = new Pool(null,{
  poolSize: 10,
  createConnection: common.createConnection.bind(undefined,{
    typeCast: true
  })
});
var assert     = require('assert');
var expected = {
  'DECIMAL'    : '0.330',
  'TINYINT'    : 1,
  'SMALLINT'   : 2,
  'INT'        : 3,
  'FLOAT'      : 4.5,
  'DOUBLE'     : 5.5,
  'BIGINT'     : '6',
  'MEDIUMINT'  : 7,
  'YEAR'       : 2012,
  'TIMESTAMP'  : new Date('2012-05-12 11:00:23'),
  'DATETIME'   : new Date('2012-05-12 11:02:32'),
  'DATE'       : new Date('2012-05-12'),
  'TIME'       : '13:13:23',
  'BINARY'     : new Buffer([0, 1, 254, 255]),
  'VARBINARY'  : new Buffer([0, 1, 254, 255]),
  'TINYBLOB'   : new Buffer([0, 1, 254, 255]),
  'MEDIUMBLOB' : new Buffer([0, 1, 254, 255]),
  'LONGBLOB'   : new Buffer([0, 1, 254, 255]),
  'BLOB'       : new Buffer([0, 1, 254, 255]),
  'BIT'        : new Buffer([0, 1, 254, 255]),
  'CHAR'       : 'Hello',
  'VARCHAR'    : 'Hello',
  'TINYTEXT'   : 'Hello World',
  'MEDIUMTEXT' : 'Hello World',
  'LONGTEXT'   : 'Hello World',
  'TEXT'       : 'Hello World',
};
var row;
pool.alloc( function(err,connection){
  if ( err ) {
    throw err;
  }
  common.useTestDb(connection);

  var schema  = [];
  var inserts = [];
  for (var key in expected) {
    var value = expected[key];
    var type = key;
    if (type === 'DECIMAL') {
      type = type + '(3,3)';
    } else if (/binary|char/i.test(type)) {
      type = type + '(' + value.length + ')';
    } else if (/bit/i.test(type)) {
      type = type + '(' + (value.length * 8) + ')';
    }

    var escaped = connection.escape(value);

    schema.push('`' + key + '` ' + type + ',');
    inserts.push('`' + key + '` = ' + escaped);
  }

  connection.query([
    'CREATE TEMPORARY TABLE `type_casting` (',
    '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
    ].concat(schema).concat([
    'PRIMARY KEY (`id`)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
  ]).join('\n'));

  connection.query('INSERT INTO type_casting SET' + inserts.join(',\n'));
  
  connection.query('SELECT * FROM type_casting', function(err, rows) {
    if (err) throw err;

    row = rows[0];
    
  });
    
});

setTimeout(function(){
  pool.end();
},10000);


process.on('exit', function() {
  for (var key in expected) {
    var expectedValue = expected[key];
    var actualValue   = row[key];

    if (expectedValue instanceof Date) {
      expectedValue = Number(expectedValue);
      actualValue   = Number(actualValue);
    } else if (Buffer.isBuffer(expectedValue)) {
      expectedValue = Array.prototype.slice.call(expectedValue)+'';
      actualValue   = Array.prototype.slice.call(actualValue)+'';
    }

    assert.strictEqual(actualValue, expectedValue, key + ': ' + actualValue + ' !== ' + expectedValue);
  }
});
