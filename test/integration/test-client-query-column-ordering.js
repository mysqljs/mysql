var common = require('../common');
var assert = require('assert');
var test = common.fastOrSlow.slow();
var mysql = require(common.dir.lib + '/mysql');
var fs = require('fs');

test.before(function() {
  this.client = common.createClient();
});

test.after(function(done) {
  this.client.end(done);
});

test('Column ordering works properly', {timeout: 15 * 1000}, function(done) {
  var REPEATS = 500;

  this.client.query('CREATE DATABASE ' + common.TEST_DB, function(err) {
    if (err && err.number != mysql.ERROR_DB_CREATE_EXISTS) {
      throw err;
    }
  });
  this.client.query('USE ' + common.TEST_DB);

  this.client.query('DROP TABLE IF EXISTS columnia');
  var fixture = fs.readFileSync(common.dir.fixture + '/columnia.sql', 'utf8');
  this.client.query(fixture);

  var finished = 0;
  var self = this;
  for (var i = 0; i < REPEATS; i++) {
    (function(i) {
      var query = self.client.query("SHOW COLUMNS FROM columnia");

      query.on('row', function(row) {
        if (!row.Type) {
          throw new Error('Column order mixed up after '+i+' queries.');
        }
      });

      query.on('end', function() {
        finished++;
        if (finished === REPEATS) {
          done();
        }
      });
    })(i);
  }
});

