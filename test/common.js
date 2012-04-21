var common = exports;
var path   = require('path');

common.lib = path.join(__dirname, '../lib');

var Mysql = require('../');

common.createConnection = function() {
  return Mysql.createConnection({
    host     : process.env.MYSQL_HOST,
    port     : process.env.MYSQL_PORT,
    user     : process.env.MYSQL_USER,
    password : process.env.MYSQL_PASSWORD,
  });
};
