var Mysql      = require('../../../');
var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

connection.config.queryFormat = function (query, values, tz) {
  return query.replace(/\:(\w+)/g, function (txt, key) {
    if (values.hasOwnProperty(key)) {
      return connection.escape(values[key]);
    }
    return txt;
  });
};

assert.equal(connection.format("SELECT :a1, :a2", { a1: 1, a2: 'two' }), "SELECT 1, 'two'");
