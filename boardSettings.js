"use strict";
if(!Promise) var Promise = require('es6-promise').Promise;
var path = require('path');
var utils = require('./utils');
var modulePath = utils.modulePath;

exports.settings = {};
var fs = require('fs');
var file = fs.readFileSync(path.resolve(modulePath('quirkbot-arduino-hardware'), 'avr', 'boards.txt')).toString();
var lines = file.split('\n');
lines.forEach(function (line) {
	var parts = line.split('=');
	if(parts.length === 2){
		var key = parts[0];
		var value =  parts[1];
		exports.settings[key] = value;
	}
});
