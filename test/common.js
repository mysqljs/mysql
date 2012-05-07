var common = exports;
var path   = require('path');
var _      = require('underscore');

common.lib = path.join(__dirname, '../lib');

// Useful for triggering ECONNREFUSED errors on connect()
common.bogusPort     = 47378;
// Useful for triggering ER_ACCESS_DENIED_ERROR errors on connect()
common.bogusPassword = 'INVALID PASSWORD';

common.testDatabase = process.env.MYSQL_TEST_DATABASE;

var Mysql = require('../');

common.createConnection = function(config) {
  return Mysql.createConnection(_.extend({
    host     : process.env.MYSQL_HOST,
    port     : process.env.MYSQL_PORT,
    user     : process.env.MYSQL_USER,
    password : process.env.MYSQL_PASSWORD,
  }, config));
};
