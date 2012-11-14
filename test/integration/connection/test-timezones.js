var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

common.useTestDb(connection);

var table = 'timezone_test';
connection.query([
  'CREATE TEMPORARY TABLE `' + table + '`(',
  '`offset` varchar(10),',
  '`dt` datetime',
  ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
].join('\n'));

var tests = [ 0, 1, 5, 12, 26, -1, -5, -20, 'Z', 'local' ];

connection.query('DELETE FROM ' + table);

testNextDate();

function testNextDate() {
  if (tests.length === 0) {
    return connection.end();
  }

  var test = tests.pop();

  testDate(test, function () {
    testNextDate();
  });
}

function testDate(offset, cb) {
  var dt = new Date();

  if (offset == 'Z' || offset == 'local') {
    connection.config.timezone = offset;
  } else {
    connection.config.timezone = (offset < 0 ? "-" : "+") + pad2(Math.abs(offset)) + ":00";
  }
  connection.query('INSERT INTO ' + table + ' SET ?', { offset: offset, dt: dt });

  if (offset == 'Z') {
    dt.setTime(dt.getTime() + (dt.getTimezoneOffset() * 60000));
  } else if (offset != 'local') {
    dt.setTime(dt.getTime() + (dt.getTimezoneOffset() * 60000) + (offset * 3600000));
  }

  connection.query({
    sql: 'SELECT * FROM ' + table + ' WHERE offset = \'' + offset + '\'',
    typeCast: function (field, next) {
      if (field.type != 'DATETIME') return next();

      return new Date(field.string());
    }
  }, function (err, result) {
    if (err) throw err;

    assert.strictEqual(dt.toString(), result[0].dt.toString());

    return cb();
  });
}

function pad2(v) {
  return (v < 10 ? "0" : "") + v;
}
