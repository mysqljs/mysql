var timezone_mock = require('timezone-mock');

var assert = require('assert');
var common = require('../../common');

function registerMock() {
  timezone_mock.register('US/Pacific');
  var date = new Date(Date.now());
  var tzo = date.getTimezoneOffset();
  assert.ok(tzo === 420 || tzo === 480);
}

var table = 'timezone_test';
var pre_statements = ['', 'SET TIME_ZONE="+00:00"', 'SET TIME_ZONE="SYSTEM"', registerMock];
var pre_idx = 0;
var test_days = ['01-01', '03-07', '03-08', '03-09', '12-31'].map(function (day) {
  // Choosing this because 2015-03-08 02:30 Pacific does not exist (due to DST),
  // so if anything is using a local date object it will fail (at least if the
  // test system is in Pacific Time).
  return '2015-' + day + 'T02:32:11.000Z';
});
var day_idx = 0;
var test_timezones = ['Z', 'local', 0, 1, 5, 12, 23, -1, -5, -20];
var tz_idx = 0;

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  common.useTestDb(connection);

  connection.query([
    'CREATE TEMPORARY TABLE ?? (',
    '`day` varchar(24),',
    '`timezone` varchar(10),',
    '`pre_idx` int,',
    '`dt` datetime',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
  ].join('\n'), [table], assert.ifError);

  if (pre_statements[pre_idx]) {
    connection.query(pre_statements[pre_idx], assert.ifError);
  }
  testNextDate(connection);
});

function testNextDate(connection) {
  if (tz_idx === test_timezones.length || day_idx === test_days.length) {
    ++pre_idx;
    if (pre_idx === pre_statements.length) {
      connection.end(assert.ifError);
      return;
    } else {
      if (typeof pre_statements[pre_idx] === 'function') {
        pre_statements[pre_idx]();
      } else {
        connection.query(pre_statements[pre_idx], assert.ifError);
      }
      day_idx = tz_idx = 0;
    }
  }

  var day = test_days[day_idx];
  var offset = test_timezones[tz_idx];

  ++day_idx;
  if (day_idx === test_days.length) {
    day_idx = 0;
    ++tz_idx;
  }

  var timezone;
  if (offset === 'Z') {
    timezone = offset;
    offset = 0;
  } else if (offset === 'local') {
    timezone = offset;
  } else {
    timezone = (offset < 0 ? '-' : '+') + pad2(Math.abs(offset)) + ':00';
  }

  var dt = new Date(day);
  assert.strictEqual(day, dt.toISOString());

  var expected_date_string;
  if (offset === 'local') {
    // If using a local timezone, it should be the same day/hour/etc as the Javascript date formatter
    // Beware Daylight Saving Time though, using a "local" timezone is never a good idea, it maps
    // multiple unique UTC dates to the same string.
    expected_date_string = dt.getFullYear() + '-' + pad2(dt.getMonth() + 1) + '-' + pad2(dt.getDate()) + ' ' +
      pad2(dt.getHours()) + ':' + pad2(dt.getMinutes()) + ':' + pad2(dt.getSeconds());
  } else {
    // If using a specific timezone, it should be a simple offset from the UTC date
    var expected_dt = new Date(dt.getTime() + offset * 60 * 60 * 1000);
    expected_date_string = expected_dt.getUTCFullYear() + '-' +
      pad2(expected_dt.getUTCMonth() + 1) + '-' +
      pad2(expected_dt.getUTCDate()) + ' ' +
      pad2(expected_dt.getUTCHours()) + ':' +
      pad2(expected_dt.getUTCMinutes()) + ':' +
      pad2(expected_dt.getUTCSeconds());
  }

  connection.config.timezone = timezone;
  connection.query('INSERT INTO ?? SET ?', [table, {day: day, timezone: timezone, dt: dt, pre_idx: pre_idx}], assert.ifError);

  var options = {
    sql      : 'SELECT * FROM ?? WHERE timezone = ? AND day = ? AND pre_idx = ?',
    values   : [table, timezone, day, pre_idx],
    typeCast : function (field, next) {
      if (field.type !== 'DATETIME') {
        return next();
      }
      return field.string();
    }
  };

  connection.query(options, function (err, rows_raw) {
    assert.ifError(err);
    assert.equal(rows_raw.length, 1);
    delete options.typeCast;
    connection.query(options, function (err, rows) {
      assert.ifError(err);
      assert.equal(rows.length, 1);
      if (dt.getTime() !== rows[0].dt.getTime() || expected_date_string !== rows_raw[0].dt) {
        console.log('Failure while testing date: ' + day + ', Timezone: ' + timezone);
        console.log('Pre-statement: ' + pre_statements[pre_idx]);
        console.log('Expected raw string: ' + expected_date_string);
        console.log('Received raw string: ' + rows_raw[0].dt);
        console.log('Expected date object: ' + dt.toISOString() + ' (' + dt.getTime() + ', ' + dt.toLocaleString() + ')');
        console.log('Received date object: ' + rows[0].dt.toISOString() + ' (' + rows[0].dt.getTime() + ', ' + rows[0].dt.toLocaleString() + ')');
        assert.strictEqual(expected_date_string, rows_raw[0].dt);
        assert.strictEqual(dt.toISOString(), rows[0].dt.toISOString());
      }
      testNextDate(connection);
    });
  });
}

function pad2(v) {
  return (v < 10 ? '0' : '') + v;
}
