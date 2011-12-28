var _         = require('underscore');
var Fs        = require('fs');
var Client    = exports.Client = require('./Client');
var Constants = require('./Constants');
var Mysql     = exports;

Mysql.PACKAGE = (function() {
  var json = Fs.readFileSync(__dirname + '/../package.json', 'utf8');
  return JSON.parse(json);
})();

Mysql.createClient = Client.create;

_.extend(exports, Constants);
