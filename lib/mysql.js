var hashish = require('hashish');
var Client = exports.Client = require('./client');
var constants = require('./constants');

exports.createClient = function(config) {
  var client = new Client();
  hashish.update(client, config || {});
  return client;
};

hashish.update(exports, constants);
