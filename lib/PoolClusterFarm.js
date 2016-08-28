var Pool          = require('./Pool');
var PoolConfig    = require('./PoolConfig');
var PoolNamespace = require('./PoolNamespace');
var PoolSelector  = require('./PoolSelector');
var Util          = require('util');
var EventEmitter  = require('events').EventEmitter;

/**
 * PoolClusterFarm
 * @constructor
 * @param {object} [config] The pool cluster farm configuration
 * @public
 */
function PoolClusterFarm(config) {
  EventEmitter.call(this);

  config = config || {};
  this._servers = [];
  this._numMasters = 0;
  this._numSlaves = 0;
  this._last_index = 0;
  this.debug = config.debug || false
}

Util.inherits(PoolClusterFarm,EventEmitter);

PoolClusterFarm.prototype.query = function query(sql,values,cb) {
	var self = this

	if (!this._numMasters || this._numMasters < 1) {
		if (cb && typeof cb == 'function') { return cb('No servers assigned to PoolClusterFarm. Please verify...'); }
		else { return values('No servers assigned to PoolClusterFarm. Please verify...'); }
	}

	if (typeof sql != 'string' || sql.length < 7) {
		if (cb && typeof cb == 'function') { return cb('Invalid sql statement. Please verify...'); }
		else { return values('Invalid sql statement. Please verify...'); }
	}

	if (sql.substr(0,6).toLowerCase() == 'select') {
		var index_to_use = this._last_index;
		if (index_to_use >= (this._servers.length)) { this._last_index = index_to_use = 0; }
		else { this._last_index++; }
		if (this.debug) { console.log('Using server',(index_to_use+1),'of',(this._servers.length)); }
		this._servers[index_to_use].pool.query(sql,values,cb);
	} else {
		var num = this._numMasters;

		var updateMasters = function(i) {
			self._servers[i].pool.query(sql,values,function(err,rows) {
				if (!(--num)) {
					if (cb && typeof cb == 'function') { return cb(err,rows); }
					else { return values(err,rows); }
				}
			});
		}

		for (var i = 0; i < this._servers.length; i++) {
			if (this._servers[i].type == 'master') {
				updateMasters(i);
			}
		}

	}
}

PoolClusterFarm.prototype.add = function add(id,type,config,respond) {
	if (!respond || typeof respond != 'function') { respond = function(err){ throw new Error(err) }; }
	var server_name = typeof id == 'string' ? id : this._makeId();
	var server_type = typeof type == 'string' && (type == 'master' || type == 'slave') ? type : 'master';
	var server_config = {};
	if (config && typeof config == 'object') {
		server_config = config;
	} else if (type && typeof type == 'object') {
		server_config = type;
	} else if (id && typeof id == 'object') {
		server_config = id;
	} else {
		return respond('No server configuration passed in. Please look at the documentation.');
	}
	var err = this._verifyConfig(server_config);
	if (err) { return respond(err); }
	var poolConfig = new PoolConfig(server_config)
	this._servers.push({
		id 			: 	server_name,
		type 		: 	server_type,
		pool 		: 	new Pool({config:poolConfig}),
		online 	: 	1
	})
	this._calculateNumServers()
}

PoolClusterFarm.prototype._verifyConfig = function _verifyConfig(config) {
	if (!config.user) { return 'User must be passed in to make a database connection'; }
	if (!config.password) { return 'Password must be passed in to make a database connection'; }
	return null;
}

PoolClusterFarm.prototype._makeId = function _makeId() {
	return Math.random().toString(36).substring(5);
}

PoolClusterFarm.prototype._setLocked = function _setLocked(locked) {
	this._locked = locked ? true : false;
}

PoolClusterFarm.prototype.isLocked = function isLocked() {
	return this._locked;
}

PoolClusterFarm.prototype._calculateNumServers = function _calculateNumServers() {
	this._numMasters = 0;
	this._numSlaves = 0;
	for (var i = 0; i < this._servers.length; i++) {
		if (this._servers[i].type == 'master') { this._numMasters++; }
		else { this._numSlaves++; }
	}
}

module.exports = PoolClusterFarm;