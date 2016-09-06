"use strict";
var Promise = require('es6-promise').Promise;
var utils = require('./utils');
var db = require('diskdb');

db = db.connect(process.env.COMPILER_DISK_DB_PATH  || process.env.DISK_DB_PATH  || './db')
db.loadCollections([
	'programs',
	'configs'
]);


exports.create = function(code){
	var promise = function(resolve, reject){
		var instance = db.programs.save({
			code : code,
			pending: true,
			ready: false,
			createdAt: Date.now()
		});
		db.programs.update(
			{ _id : instance._id },
			{ id : instance._id }
		);
		resolve(instance._id);
	}
	return new Promise(promise);
}
exports.countPending = function(){
	var promise = function(resolve, reject){
		var count = db.programs.count({
			pending: true,
			ready: false
		});
		resolve(count);
	}
	return new Promise(promise);
}
exports.getNext = function(){
	var promise = function(resolve, reject){
		var instance = db.programs.findOne(
			{ pending: true }
		);
		if(!instance){
			return reject('No pending requests')
		}
		var result = db.programs.update(
			{ id: instance.id },
			{ pending: false }
		);
		if(result.updated == 1){
			instance.pending = false;
			return resolve(instance);
		}
		return reject('Error');
	}
	return new Promise(promise);
}
exports.setReady = function(id, hex, error, size){
	var promise = function(resolve, reject){
		error = error || '';
		hex = hex || '';
		size = size || [];

		var result = db.programs.update(
			{ id: id },
			{
				ready: true,
				hex: hex,
				size: size,
				error: error
			}
		);
		resolve(id);
	}
	return new Promise(promise);
}
exports.extract = function(id){
	var promise = function(resolve, reject){
		var instance = db.programs.findOne(
			{
				id: id
			}
		);
		if(instance){
			resolve(instance);
		}
		else{
			reject('Cannot extract '+id);
		}
	}
	return new Promise(promise);
}
exports.clearOld = function(interval){
	interval = interval || 300000;
	var promise = function(resolve, reject){
		var all = db.programs.find();
		all.forEach(function(instance) {
			if((Date.now() - instance.createdAt) > interval){
				db.programs.remove({
					_id: instance._id
				});
			}
		})
		resolve();
	}
	return new Promise(promise);
}
exports.truncate = function(id){
	var promise = function(resolve, reject){
		db.programs.remove({});
		resolve();
	}
	return new Promise(promise);
}

exports.setConfig = function(key, value){
	var promise = function(resolve, reject){
		var result = db.configs.update(
			{
				key: key
			},
			{
				key: key,
				value: value
			},
			{
				upsert: true
			}
		);
		resolve();
	}
	return new Promise(promise);
}

exports.getConfig = function(key){
	var promise = function(resolve, reject){
		var instance = db.configs.findOne(
			{
				key: key
			}
		);
		if(instance){
			resolve(instance);
		}
		else{
			reject('This key does not exits.')
		}
		resolve();
	}
	return new Promise(promise);
}


exports.removeConfig = function(key){
	var promise = function(resolve, reject){
		db.configs.remove(
			{
				key: key
			}
		);
		resolve();
	}
	return new Promise(promise);
}
