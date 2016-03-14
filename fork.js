"use strict";

// Utils -----------------------------------------------------------------------
var path = require('path');
var utils = require('./utils');
var pass = utils.pass;
var execute = utils.execute;
var writeFile = utils.writeFile;
var findFiles = utils.findFiles;
var readFile = utils.readFile;
var readDir = utils.readDir;
var mkdir = utils.mkdir;
var copyDir = utils.copyDir;
var deleteDir = utils.deleteDir;
var boardSettings = require('./boardSettings').settings;
/// Interface -------------------------------------------------------------------
/**
* Holds the label of this fork. This is permanent id of this for in realtion to
* the master process. If the forks die, it will be replaced by a new one with
* the same LABEL.
*/
var LABEL;
/**
* Const
*/
var TMP;
var SKETCHES;
var COMMAND;

/**
* Initializes the temp directories and compile the base firmeware.
* When it's complete, send a 'init' message so the master process can start
* requesting compilations.
*/
var init = function () {
	if(typeof LABEL === 'undefined') return;

	var cleanUp = function() {
		return new Promise(function(resolve, reject){
			pass()
			.then(deleteDir(path.resolve(TMP)))
			.then(deleteDir(path.resolve(SKETCHES)))
			.then(mkdir(path.resolve(TMP)))
			.then(mkdir(path.resolve(SKETCHES)))
			.then(copyDir(path.resolve('firmware', 'firmware.ino'), path.resolve(SKETCHES, 'firmware.ino')))
			.then(resolve)
			.catch(reject);
		});
	}
	var compileResetFirmaware = function() {
		return new Promise(function(resolve){
			var precompileCommand =
				path.resolve('node_modules', 'npm-arduino-builder', 'arduino-builder', 'arduino-builder') + ' ' +
				'-hardware="' + path.resolve('node_modules') + '" ' +
				'-hardware="' + path.resolve('node_modules', 'npm-arduino-builder', 'arduino-builder', 'hardware') + '" ' +
				'-libraries="' + path.resolve('node_modules') + '" ' +
				'-tools="' + path.resolve('node_modules', 'npm-arduino-avr-gcc', 'tools') + '" ' +
				'-tools="' + path.resolve('node_modules', 'npm-arduino-builder', 'arduino-builder', 'tools') + '" ' +
				'-fqbn="quirkbot-arduino-hardware:avr:quirkbot" ' +
				'-ide-version=10607 ' +
				'-build-path="' + path.resolve(TMP) + '" ' +
				'-verbose ' +
				path.resolve(SKETCHES, 'firmware.ino');

			pass()
			.then(execute(precompileCommand))
			.then(resolve)
			.catch(function (error) {
				console.log('Error saving reset firmware.', error);
				reject(error)
			});
		});
	}

	pass()
	.then(cleanUp)
	.then(compileResetFirmaware)
	.then(function(){
		process.send({
			type: 'init',
			data:{
				worker: LABEL
			}
		})
	})
	.catch(function(error){
		new Error(error);
	});


}
/**
* This is the entrypoint of a compilation
*/
var run = function(id, code){
	if(typeof LABEL === 'undefined' || typeof id === 'undefined' ) return;

	//console.log('run', LABEL, id)
	var sketch = {
		_id: id,
		code: code
	}
	var now = Date.now();
	pass(sketch)
	.then(compile)
	.then(function(){
		console.log('finished', LABEL, id, Date.now() - now);
		if(sketch.error){
			console.log('error:\t', sketch.error);
		}
		process.send({
			type: 'success',
			data:{
				worker: LABEL,
				id: sketch._id,
				hex: sketch.hex,
				error: sketch.error
			}
		})
	});
}
process.on('message', function(message) {
	if(message.type == 'label'){
		console.log('Fork created: ' +  message.data);
		LABEL = message.data;
		TMP = '.tmp-build' + LABEL;
		SKETCHES = '.tmp-sketches' + LABEL;
		COMMAND = path.resolve('node_modules', 'npm-arduino-builder', 'arduino-builder', 'arduino-builder') + ' ' +
			'-build-options-file="' + path.resolve(TMP, 'build.options.json') + '" ' +
			'-build-path="' + path.resolve(TMP) + '" ' +
			'-verbose ' +
			path.resolve(SKETCHES, 'firmware.ino') ;
		init();
	}
	else if(message.type == 'run'){
		run(message.data.id,message.data.code);
	}
});
// Level0 ----------------------------------------------------------------------
var compile = function(sketch){
	var promise = function(resolve, reject){
		pass(sketch)
		.then(writeFile(path.resolve(SKETCHES, 'firmware.ino'), sketch.code)())
		.then(execute(COMMAND))
		.then(readFile(path.resolve(TMP, 'firmware.ino.hex')))
		.then(function(hex){
			sketch.hex = hex;
			resolve(sketch)
		})
		.catch(function(error){
			sketch.error = error;
			resolve(sketch)
		})
	};
	return new Promise(promise);
};