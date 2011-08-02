var common = require('../common');
var assert = require('assert');
var test = common.fastOrSlow.slowTestCase();

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
  this.client.statistics(function statisticsCb(err, statistics) {
    assert.ok(statistics.extra.match(/time/i));
    done(err);
  });
});

