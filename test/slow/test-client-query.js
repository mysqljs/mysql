var common = require('../common');
var assert = require('assert');
var test = common.fastOrSlow.slowTestCase();

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
