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
