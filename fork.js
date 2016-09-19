"use strict";
if(!Promise) var Promise = require('es6-promise').Promise;
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
var modulePath = utils.modulePath;
var boardSettings = require('./boardSettings').settings;

// Polyfill for the process (in case running outside a cluster)
var _process = process;
_process.on = process.on || function() {};
_process.send = process.send || function() {};

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
var TMP_SLUG;
var BUILD;
var BUILD_SLUG;
var SKETCHES;
var SKETCHES_SLUG;
var TOOLS;
var TOOLS_SLUG;
var COMPILE_COMMAND;
var HARDWARE_SLUG;
var LIBRARY_SLUG;
var FAST_COMPILE_COMMAND;
var SIZE_COMMAND;

/**
* Interface with master process
*/
_process.on('message', function(message) {
	if(message.type == 'label'){
		setup(message.data);
	}
	else if(message.type == 'run'){
		run(message.data.id,message.data.code);
	}
});
/**
* Setup the fork
*/
var setup = function(label) {
	console.log('Fork created: ' +  label);
	LABEL = label;
	TMP_SLUG = '_t' + LABEL;
	BUILD_SLUG = 'b';
	SKETCHES_SLUG = 's';
	TOOLS_SLUG = 't';
	HARDWARE_SLUG = 'h';
	LIBRARY_SLUG = 'l';
	TMP = path.join(__dirname, TMP_SLUG );
	BUILD = path.join(TMP, BUILD_SLUG);
	SKETCHES = path.join(TMP, SKETCHES_SLUG);
	TOOLS = path.join(TMP, TOOLS_SLUG);
	COMPILE_COMMAND = path.resolve(TOOLS, 'npm-arduino-builder', 'arduino-builder', 'arduino-builder') + ' ' +
		'-build-options-file="' + path.resolve(BUILD, 'build.options.json') + '" ' +
		'-build-path="' + path.resolve(BUILD) + '" ' +
		'-verbose ' +
		path.resolve(SKETCHES, 'firmware.ino');
	SIZE_COMMAND =
		// On "lite", use the avr-gcc direcly from the node_modules
		(process.env.NODE_ENV === 'lite' ?
			path.resolve(modulePath('npm-arduino-avr-gcc'), 'tools', 'avr', 'bin', 'avr-size') + ' '
			:
			path.resolve(TOOLS, 'npm-arduino-avr-gcc', 'tools', 'avr', 'bin', 'avr-size') + ' '
		)+
		path.resolve(BUILD, 'firmware.ino.elf');
	return init();
}
module.exports.setup = setup;
/**
* Initializes the temp directories and compile the base firmeware.
* When it's complete, send a 'init' message so the master process can start
* requesting compilations.
*/
var init = function () {
	return new Promise(function(resolve, reject){
		if(typeof LABEL === 'undefined') {
			reject('LABEL is undefined.')
			return;
		};

		var precleanUp = function() {
			return new Promise(function(resolve, reject){
				pass()
				.then(deleteDir(path.resolve(TMP)))
				.then(mkdir(path.resolve(TMP)))
				.then(mkdir(path.resolve(BUILD)))
				.then(mkdir(path.resolve(TOOLS)))
				.then(mkdir(path.resolve(SKETCHES)))
				.then(copyDir(path.resolve(__dirname, 'firmware', 'firmware.ino'), path.resolve(SKETCHES, 'firmware.ino')))
				.then(copyDir(path.resolve(modulePath('npm-arduino-builder')), path.resolve(TOOLS, 'npm-arduino-builder')))
				.then(function(){
					// On "lite", use the avr-gcc direcly from the node_modules
					if(process.env.NODE_ENV === 'lite') {
						return;
					}
					return copyDir(path.resolve(modulePath('npm-arduino-avr-gcc')), path.resolve(TOOLS, 'npm-arduino-avr-gcc'))()
				})
				.then(copyDir(path.resolve(modulePath('quirkbot-arduino-hardware')), path.resolve(TOOLS, HARDWARE_SLUG)))
				.then(copyDir(path.resolve(modulePath('quirkbot-arduino-library')), path.resolve(TOOLS, LIBRARY_SLUG)))
				.then(resolve)
				.catch(reject);
			});
		}

		var compileResetFirmware = function() {
			return new Promise(function(resolve){
				var precompileCommand =
					path.resolve(TOOLS, 'npm-arduino-builder', 'arduino-builder', 'arduino-builder') + ' ' +
					'-hardware="' + path.resolve(TOOLS) + '" ' +
					'-hardware="' + path.resolve(TOOLS, 'npm-arduino-builder', 'arduino-builder', 'hardware') + '" ' +
					'-libraries="' + path.resolve(TOOLS) + '" ' +
					// On "lite", use the avr-gcc direcly from the node_modules
					(process.env.NODE_ENV === 'lite' ?
						'-tools="' + path.resolve(modulePath('npm-arduino-avr-gcc'), 'tools') + '" '
						:
						'-tools="' + path.resolve(TOOLS, 'npm-arduino-avr-gcc', 'tools') + '" '
					)+
					'-tools="' + path.resolve(TOOLS, 'npm-arduino-builder', 'arduino-builder', 'tools') + '" ' +
					'-fqbn="'+HARDWARE_SLUG+':avr:quirkbot" ' +
					'-ide-version=10607 ' +
					'-build-path="' + path.resolve(BUILD) + '" ' +
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

		var prepareFastCompilation = function() {
			return new Promise(function(resolve){

				pass()
				.then(execute(COMPILE_COMMAND))
				.then(function(result){
					var compile = result.stdout
						.split(/\r?\n/)
						.filter(function(line) {
							return line.indexOf('firmware.ino.cpp.o') !== -1
						})
						.slice(0,1);

					var _open;
					var linkAndCopy = result.stdout
						.split(/\r?\n/)
						.filter(function(line) {
							if(!_open){
								if(line.indexOf('firmware.ino.elf') !== -1){
									_open = true;
									return true;
								}
							}
							if(_open){
								if(line.indexOf('firmware.ino.hex') !== -1){
									_open = false;
									return true;
								}
							}
						})

					var build = compile.concat(linkAndCopy);

					// As windows complains about 'too long command line', we
					// relativise all the paths, and cd to the root directory
					FAST_COMPILE_COMMAND = 'cd ' + TMP + ' && ' +
					build.join(' && ').split(TMP + path.sep).join('');

					if(process.platform === 'win32'){
						FAST_COMPILE_COMMAND = FAST_COMPILE_COMMAND
						.split('/').join('\\').split('\'').join('');
					}

					console.log('FAST_COMPILE_COMMAND',FAST_COMPILE_COMMAND);

				})
				.then(resolve)
				.catch(function (error) {
					console.log('Error preparing fast compilation.', error);
					reject(error)
				});
			});
		}

		var prepareForExport = function() {
			return new Promise(function(resolve, reject){
				pass()
				.then(deleteDir(path.resolve(SKETCHES)))
				.then(deleteDir(path.resolve(TOOLS, 'npm-arduino-builder')))
				//.then(deleteDir(path.resolve(TOOLS, HARDWARE_SLUG)))
				//.then(deleteDir(path.resolve(TOOLS, LIBRARY_SLUG)))
				.then(deleteDir(path.resolve(TOOLS, 'npm-arduino-avr-gcc', 'node_modules')))
				//.then(deleteDir(path.resolve(BUILD, LIBRARY_SLUG)))
				.then(function() {
					var RELATIVE_FAST_COMPILE_COMMAND = FAST_COMPILE_COMMAND.split(path.resolve(TOOLS, '..')).join(path.join('..'))
					// Save the command to disk so it can be used by the microcore compiler
					return pass()
					.then(writeFile(path.resolve(BUILD, 'fast_compile.sh'), RELATIVE_FAST_COMPILE_COMMAND));
				})
				.then(resolve)
				.catch(reject);
			});
		}

		pass()
		.then(precleanUp)
		.then(compileResetFirmware)
		.then(prepareFastCompilation)
		.then(prepareForExport)

		.then(function(){
			_process.send({
				type: 'init',
				data:{
					worker: LABEL
				}
			})
			resolve(LABEL);
		})
		.catch(function(error){
			console.log(error);
			reject(error);
		});

	})

}
module.exports.init = init;
/**
* This is the entrypoint of a compilation
*/
var run = function(id, code){
	return new Promise(function(resolve, reject){
		if(typeof LABEL === 'undefined' || typeof id === 'undefined' ){
			reject('LABEL or id are undefined.')
			return;
		};

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
			var data = {
				worker: LABEL,
				id: sketch._id,
				hex: sketch.hex,
				size: sketch.size,
				error: sketch.error
			};
			_process.send({
				type: 'success',
				data: data
			});
			resolve(data);
		});
	});
}
module.exports.run = run;
// Level0 ----------------------------------------------------------------------
var compile = function(sketch){
	var promise = function(resolve, reject){
		pass(sketch)
		//.then(deleteDir(path.resolve(BUILD, 'sketch')))
		//.then(mkdir(path.resolve(BUILD, 'sketch')))
		.then(writeFile(path.resolve(BUILD, 'sketch', 'firmware.ino.cpp'), sketch.code))
		.then(execute(FAST_COMPILE_COMMAND))
		.then(execute(SIZE_COMMAND))

		//.then(writeFile(path.resolve(SKETCHES, 'firmware.ino'), sketch.code)())
		//.then(execute(COMPILE_COMMAND))
		//.then(execute(SIZE_COMMAND))
		.then(function(size) {
			if(size.stderr){
				throw new Error(size.stderr);
				return;
			}
			// The size result will be on the format like the example below:
			// text		data	bss	    dec	    	hex
  			// 14442	146	    586		15174	   3b46
			//
			// We want to return ROM (text + data) and RAM (data + bss)
			var processedSize = size.stdout.split('\n');
			if(processedSize.length < 2){
				throw new Error('Invalid size string: ' + size.stdout);
				return;
			}
			processedSize = processedSize[1].split('\t');
			if(processedSize.length < 5){
				throw new Error('Invalid size string: ' + size.stdout);
				return;
			}
			processedSize = processedSize.slice(0,3);
			processedSize = processedSize.map(function(item) {
				return Number(item.replace(/\s/g, ''));
			});
			var rom = processedSize[0] + processedSize[1];
			var ram = processedSize[1] + processedSize[2];
			var maxRom = boardSettings['quirkbot.upload.maximum_size'];
			var maxRam = Math.floor(boardSettings['quirkbot.upload.maximum_data_size'] * 0.8);

			sketch.size = [ rom, maxRom, ram, maxRam ];

			if(rom > maxRom){
				throw 'ROM_MAX';
				return;
			}
			// Max ram at 90%
			if(ram > maxRam){
				throw 'RAM_MAX';
				return;
			}

		})
		.then(readFile(path.resolve(BUILD, 'firmware.ino.hex')))
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
module.exports.run = run;