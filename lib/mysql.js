var mysql = exports;
var hashish = require('hashish');
var Client = exports.Client = require('./client');
var constants = require('./constants');
var fs = require('fs');

mysql.PACKAGE = (function() {
  var json = fs.readFileSync(__dirname + '/../package.json', 'utf8');
  return JSON.parse(json);
})();

mysql.createClient = function(config) {
  var client = new Client();
  hashish.update(client, config || {});
  return client;
};

hashish.update(exports, constants);
