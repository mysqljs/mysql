var common     = exports;
var path       = require('path');
var _          = require('underscore');
var FakeServer = require('./FakeServer');

common.lib      = path.join(__dirname, '../lib');
common.fixtures = path.join(__dirname, 'fixtures');

// Useful for triggering ECONNREFUSED errors on connect()
common.bogusPort     = 47378;
// Useful for triggering ER_ACCESS_DENIED_ERROR errors on connect()
common.bogusPassword = 'INVALID PASSWORD';

// Used for simulating a fake mysql server
common.fakeServerPort = 32893;
// Used for simulating a fake mysql server
common.fakeServerSocket = __dirname + '/fake_server.sock';

common.testDatabase = process.env.MYSQL_DATABASE;

var Mysql = require('../');

common.createConnection = function(config) {
  var isTravis = Boolean(process.env.CI);
  if (isTravis) {
    // see: http://about.travis-ci.org/docs/user/database-setup/
    config = _.extend({
      user: 'root',
    }, config);
  } else {
    config = _.extend({
      host     : process.env.MYSQL_HOST,
      port     : process.env.MYSQL_PORT,
      user     : process.env.MYSQL_USER,
      password : process.env.MYSQL_PASSWORD,
    }, config)
  }

  return Mysql.createConnection(config);
};

common.createFakeServer = function(options) {
  return new FakeServer(_.extend({}, options));
};

common.useTestDb = function(connection) {
  var query = connection.query('CREATE DATABASE ' + common.testDatabase, function(err) {
    if (err && err.code !== 'ER_DB_CREATE_EXISTS') throw err;
  });

  connection.query('USE ' + common.testDatabase);
}
