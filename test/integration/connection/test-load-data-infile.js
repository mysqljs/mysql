var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');
var fs         = require('fs');
var events     = require('events');

common.useTestDb(connection);

var table = 'load_data_test';
connection.query([
  'CREATE TEMPORARY TABLE `' + table + '` (',
  '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
  '`title` varchar(255),',
  'PRIMARY KEY (`id`)',
  ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
].join('\n'));

var path = common.fixtures + '/data.csv';
var _createReadStream = fs.createReadStream;
fs.createReadStream = function () {
  var realStream = _createReadStream.apply(null, arguments);
  if (arguments[0] === path) {
    var mockStream = new events.EventEmitter();
    realStream.on('data', function (buf) {
      // emit one byte one time to emulate slow read to ensure that
      // CJK character will not be mistakenly converted.
      for (var i = 0, l = buf.length; i < l; i++) {
        mockStream.emit('data', buf.slice(i, i + 1));
      }
    });
    realStream.on('end', function () {
      mockStream.emit('end');
    });
    return mockStream;
  }
  else {
    return realStream;
  }
};

// we must specify character set here to correspond with the encoding of data.csv
var sql =
  'LOAD DATA LOCAL INFILE ? INTO TABLE ' + table + ' CHARACTER SET utf8 ' +
  'FIELDS TERMINATED BY ? (id, title)';

var ok;
connection.query(sql, [path, ','], function(err, _ok) {
  if (err) throw err;

  ok = _ok;
  fs.createReadStream = _createReadStream;
});

var rows;
connection.query('SELECT * FROM ' + table, function(err, _rows) {
  if (err) throw err;

  rows = _rows;
});

// Try to load a file that does not exist to see if we handle this properly
var loadErr;
var loadResult;
var badPath = common.fixtures + '/does_not_exist.csv';

connection.query(sql, [badPath, ','], function(err, result) {
  loadErr    = err;
  loadResult = result;
});

connection.end();

process.on('exit', function() {
  assert.equal(ok.affectedRows, 4);
  assert.equal(rows.length, 4);
  assert.equal(rows[0].id, 1);
  assert.equal(rows[0].title, 'Hello World');
  assert.equal(rows[3].id, 4);
  assert.equal(rows[3].title, '中文内容');

  assert.equal(loadErr.code, 'ENOENT');
  assert.equal(loadResult.affectedRows, 0);
});
