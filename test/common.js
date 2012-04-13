var Mysql = require('../');
var common = exports;

common.createConnection = function() {
  return Mysql.createConnection({
    host     : process.env.MYSQL_HOST,
    port     : process.env.MYSQL_PORT,
    user     : process.env.MYSQL_USER,
    password : process.env.MYSQL_PASSWORD,
  });
};
