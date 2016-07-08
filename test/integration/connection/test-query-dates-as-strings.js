var common = require('../../common');
var assert = require('assert');
var util   = require('util');

var table = 'dates_as_strings';

common.getTestConnection({dateStrings: true}, function (err, connection) {
  assert.ifError(err);

  common.useTestDb(connection);

  connection.query([
    'CREATE TEMPORARY TABLE ?? (',
    '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
    '`dt` DATE,',
    'PRIMARY KEY (`id`)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
  ].join('\n'), [table], assert.ifError);

  connection.query('INSERT INTO ?? SET ?', [table, {dt: '1000-01-01'}]);
  connection.query('INSERT INTO ?? SET ?', [table, {dt: '2013-01-01'}]);
  connection.query('INSERT INTO ?? SET ?', [table, {dt: '2013-03-01'}]);

  connection.query('SELECT * FROM ??', [table], function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 3);
    assert.equal(rows[0].id, 1);
    assert.equal(rows[0].dt, '1000-01-01');
    assert.equal(rows[1].id, 2);
    assert.equal(rows[1].dt, '2013-01-01');
    assert.equal(rows[2].id, 3);
    assert.equal(rows[2].dt, '2013-03-01');
    connection.end(assert.ifError);
  });
});

common.getTestConnection({dateStrings: false}, function (err, connection) {
  assert.ifError(err);
  
  common.useTestDb(connection);
  
  connection.query([
    'CREATE TEMPORARY TABLE ?? (',
    '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
    '`dt` DATE,',
    'PRIMARY KEY (`id`)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
  ].join('\n'), [table], assert.ifError);
  
  connection.query('INSERT INTO ?? SET ?', [table, {dt: '1000-01-01'}]);
  connection.query('INSERT INTO ?? SET ?', [table, {dt: '2013-01-01'}]);
  connection.query('INSERT INTO ?? SET ?', [table, {dt: '2013-03-01'}]);
  
  connection.query('SELECT * FROM ??', [table], function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 3);
    
    assert.equal(rows[0].id, 1);
    assert.equal(rows[0].dt.getFullYear(), 1000);
    assert.equal(rows[0].dt.getMonth()+1, 1);
    assert.equal(rows[0].dt.getDate(), 1);
    assert(util.isDate(rows[0].dt));
    
    assert.equal(rows[1].id, 2);
    assert.equal(rows[1].dt.getFullYear(), 2013);
    assert.equal(rows[1].dt.getMonth()+1, 1);
    assert.equal(rows[1].dt.getDate(), 1);
    assert(util.isDate(rows[1].dt));
    
    assert.equal(rows[2].id, 3);
    assert.equal(rows[2].dt.getFullYear(), 2013);
    assert.equal(rows[2].dt.getMonth()+1, 3);
    assert.equal(rows[2].dt.getDate(), 1);
    assert(util.isDate(rows[2].dt));
    
    connection.end(assert.ifError);
  });
});
