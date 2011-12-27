var mysql     = exports;
var _         = require('underscore');
var Client    = exports.Client = require('./Client');
var constants = require('./constants');
var fs        = require('fs');

mysql.PACKAGE = (function() {
  var json = fs.readFileSync(__dirname + '/../package.json', 'utf8');
  return JSON.parse(json);
})();

mysql.createClient = Client.create;

_.extend(exports, constants);
