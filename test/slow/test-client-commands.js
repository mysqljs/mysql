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

test('ping()', function(done) {
  this.client.ping(done);
});

test('statistics()', function(done) {
  this.client.statistics(function(err, statistics) {
    assert.ok(statistics.extra.match(/time/i));
    done(err);
  });
});

test('useDatabase()', function(done) {
  this.client.useDatabase(common.TEST_DB, function(err) {
    // The TEST_DB may not exist right now, so ignore errors related to that
    if (err && err.number === mysql.ERROR_BAD_DB_ERROR) {
      err = null;
    }

    done(err);
  });
});

