var assert = require('assert');
var common = require('../../common');

var table = 'timezone_test';
var tests = [0, 1, 5, 12, 26, -1, -5, -20, 'Z', 'local'];

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  common.useTestDb(connection);

  connection.query([
    'CREATE TEMPORARY TABLE ?? (',
    '`offset` varchar(10),',
    '`dt` datetime',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
  ].join('\n'), [table], assert.ifError);

  testNextDate(connection);
});

function testNextDate(connection) {
  if (tests.length === 0) {
    connection.end(assert.ifError);
    return;
  }

  var dt = new Date();
  var offset = tests.pop();

  // datetime will round fractional seconds up, which causes this test to fail
  // depending on when it is executed. MySQL 5.6.4 and up supports datetime(6)
  // which would not require this change.
  // http://dev.mysql.com/doc/refman/5.6/en/fractional-seconds.html
  dt.setMilliseconds(0);

  if (offset === 'Z' || offset === 'local') {
    connection.config.timezone = offset;
  } else {
    connection.config.timezone = (offset < 0 ? "-" : "+") + pad2(Math.abs(offset)) + ":00";
  }

  connection.query('INSERT INTO ?? SET ?', [table, {offset: offset, dt: dt}], assert.ifError);

  if (offset === 'Z') {
    dt.setTime(dt.getTime() + (dt.getTimezoneOffset() * 60000));
  } else if (offset !== 'local') {
    dt.setTime(dt.getTime() + (dt.getTimezoneOffset() * 60000) + (offset * 3600000));
  }

  var options = {
    sql: 'SELECT * FROM ?? WHERE offset = ?',
    typeCast: function (field, next) {
      if (field.type != 'DATETIME') return next();

      return new Date(field.string());
    },
    values: [table, offset]
  };

  connection.query(options, function (err, rows) {
    assert.ifError(err);
    assert.strictEqual(dt.toString(), rows[0].dt.toString());
    testNextDate(connection);
  });
}

function pad2(v) {
  return (v < 10 ? "0" : "") + v;
}
