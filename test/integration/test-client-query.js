var common = require('../common');
var assert = require('assert');
var test = common.fastOrSlow.slow();
var mysql = require(common.dir.lib + '/mysql');

test.before(function() {
  this.client = common.createClient();
});

test.after(function(done) {
  this.client.end(done);
});

test('Virtual fields resulting from an operation', function(done) {
  this.client.query('SELECT 1 as field_a, 2 as field_b', function(err, results) {
    assert.equal(results[0].field_a, 1);
    assert.equal(results[0].field_b, 2);
    done(err);
  });
});

test('Selecting an empty string', function(done) {
  this.client.query('SELECT "" as field_a', function(err, results) {
    assert.strictEqual(results[0].field_a, "");
    done(err);
  });
});

test('Long fields', function(done) {
  function makeString(length) {
    var str = '';
    for (var i = 0; i < length; i++) {
      str += 'x';
    }
    return str;
  }

  var field_a = makeString(250),
      field_b = makeString(251),
      field_c = makeString(512),
      field_d = makeString(65537);

  var self = this;
  function test(last) {
    var query = self.client.query(
      'SELECT ? as field_a, ? as field_b, ? as field_c, ? as field_d',
      [field_a, field_b, field_c, field_d],
      function(err, results) {
      if (err) throw err;

      assert.equal(results[0].field_a, field_a);
      assert.equal(results[0].field_b, field_b);
      assert.equal(results[0].field_c, field_c);
      assert.equal(results[0].field_d, field_d);

      if (last) {
        done(err);
      }
    });
  }

  // We execute this test twice to be sure the parser is in a good state after
  // each run.
  test();
  test(true);
});

test('Query a NULL value', function(done) {
  this.client.query('SELECT NULL as field_a, NULL as field_b', function(err, results) {
    assert.strictEqual(results[0].field_a, null);
    assert.strictEqual(results[0].field_b, null);
    done(err);
  });
});

test('Real world usage', function(done) {
  this.client.query('CREATE DATABASE '+common.TEST_DB, function createDbCb(err) {
    if (err && err.number != mysql.ERROR_DB_CREATE_EXISTS) {
      done(err);
    }
  });

  this.client.query('USE '+common.TEST_DB, function useDbCb(err) {
    if (err) done(err);
  });

  this.client.query(
    'CREATE TEMPORARY TABLE '+common.TEST_TABLE+
    '(id INT(11) AUTO_INCREMENT, title VARCHAR(255), text TEXT, created DATETIME, PRIMARY KEY (id));',
    function createTableCb(err) {
      if (err) done (err);
    }
  );

  this.client.query(
    'INSERT INTO '+common.TEST_TABLE+' '+
    'SET title = ?, text = ?, created = ?',
    ['super cool', 'this is a nice long text', '2010-08-16 10:00:23'],
    function insertCb(err) {
      if (err) done(err);
    }
  );

  var query = this.client.query(
    'INSERT INTO '+common.TEST_TABLE+' '+
    'SET title = ?, text = ?, created = ?',
    ['another entry', 'because 2 entries make a better test', null]
  );

  var endCalled = false;
  query.on('end', function insertOkCb(packet) {
    endCalled = true;
  });

  var query = this.client.query(
    'SELECT * FROM '+common.TEST_TABLE,
    function selectCb(err, results, fields) {
      assert.ok(endCalled);

      assert.equal(results.length, 2);
      assert.equal(results[1].title, 'another entry');
      assert.ok(typeof results[1].id == 'number');
      assert.ok(results[0].created instanceof Date);
      assert.strictEqual(results[1].created, null);
      done(err);
    }
  );
});

