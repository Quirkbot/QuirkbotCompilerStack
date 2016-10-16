"use strict";
if(global.Promise) var Promise = global.Promise;
else var Promise = require('es6-promise').Promise;
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
var execSync = require('child_process').execSync;
var database = require('./database');
var cluster = require('cluster');
var boardSettings = require('./boardSettings').settings;

/**
 * Create control variables
**/
var TMP;
var TMP_SLUG;
var BUILD;
var BUILD_SLUG;
var SKETCHES;
var SKETCHES_SLUG;
var TOOLS;
var TOOLS_SLUG;
var HARDWARE_SLUG;
var LIBRARY_SLUG;
var setup = function(label) {
	return new Promise(function(resolve){
		TMP_SLUG = '_tm';
		BUILD_SLUG = 'b';
		SKETCHES_SLUG = 's';
		TOOLS_SLUG = 't';
		HARDWARE_SLUG = 'h';
		LIBRARY_SLUG = 'l';
		TMP = path.resolve( process.env.COMPILER_BUILD_ROOT || process.env.BUILD_ROOT || './', TMP_SLUG );
		BUILD = path.resolve(TMP, BUILD_SLUG);
		SKETCHES = path.resolve(TMP, SKETCHES_SLUG);
		TOOLS = path.resolve(TMP, TOOLS_SLUG);
		resolve();
	});
}

/**
 * Clean up temporary directories
**/
var precleanUp = function() {
	 return new Promise(function(resolve, reject){
		pass()
		.then(deleteDir(path.resolve(TMP)))
		.then(mkdir(path.resolve(TMP)))
		.then(mkdir(path.resolve(BUILD)))
		.then(mkdir(path.resolve(TOOLS)))
		.then(mkdir(path.resolve(SKETCHES)))
		.then(copyDir(path.resolve(__dirname, 'firmware', 'firmware.ino'), path.resolve(SKETCHES, 'firmware.ino')))
		.then(copyDir(path.resolve(modulePath('quirkbot-arduino-builder')), path.resolve(TOOLS, 'quirkbot-arduino-builder')))
		//.then(copyDir(path.resolve(modulePath('quirkbot-avr-gcc')), path.resolve(TOOLS, 'quirkbot-avr-gcc')))
		.then(copyDir(path.resolve(modulePath('quirkbot-arduino-hardware')), path.resolve(TOOLS, HARDWARE_SLUG)))
		.then(copyDir(path.resolve(modulePath('quirkbot-arduino-library')), path.resolve(TOOLS, LIBRARY_SLUG)))
		.then(resolve)
		.catch(reject);
	 });
}

/**
 * Save configs regarding the library and hardware info
**/
var saveLibraryConfig = function() {
	return new Promise(function(resolve){
		pass()
		.then(readFile(path.resolve(TOOLS, LIBRARY_SLUG, 'library.properties')))
		.then(function (info) {
			database.setConfig('library-info',info);
			resolve();
		})
		.catch(function (error) {
			console.log('Error saving library-info.', error);
			reject(error);
		})
	});
}
var saveHardwareConfig = function() {
	return new Promise(function(resolve){
		pass()
		.then(readFile(path.resolve(TOOLS, HARDWARE_SLUG, 'avr', 'version.txt')))
		.then(function (info) {
			database.setConfig('hardware-info',info);
			resolve();
		})
		.catch(function (error) {
			console.log('Error saving hardware-info.', error);
			reject(error);
		});
	});
}
/**
 * Compile the reset firmware
**/
var compileResetFirmaware = function() {
	return new Promise(function(resolve){
		var precompileCommand =
			'"' + path.resolve(TOOLS, 'quirkbot-arduino-builder', 'tools', 'arduino-builder') + '" ' +
			'-hardware="' + path.resolve(TOOLS) + '" ' +
			'-hardware="' + path.resolve(TOOLS, 'quirkbot-arduino-builder', 'tools', 'hardware') + '" ' +
			'-libraries="' + path.resolve(TOOLS) + '" ' +
			//'-tools="' + path.resolve(TOOLS, 'quirkbot-avr-gcc', 'tools') + '" ' +
			'-tools="' + path.resolve(modulePath('quirkbot-avr-gcc'), 'tools') + '" ' +
			'-tools="' + path.resolve(TOOLS, 'quirkbot-arduino-builder', 'tools', 'tools') + '" ' +
			'-fqbn="'+HARDWARE_SLUG+':avr:quirkbot" ' +
			'-ide-version=10607 ' +
			'-build-path="' + path.resolve(BUILD) + '" ' +
			'-verbose ' +
			'"' + path.resolve(SKETCHES, 'firmware.ino') + '"';

		console.log(precompileCommand);

		pass()
		.then(execute(precompileCommand))
		.then(function(result){
			console.log(result.stdout)
		})
		.then(readFile(path.resolve(BUILD, 'firmware.ino.hex')))
		.then(function (hex) {
			database.setConfig('firmware-reset', hex);
			resolve();
		})
		.catch(function (error) {
			console.log('Error saving reset firmware.', error);
			database.removeConfig('firmware-reset');
			reject(error)
		});
	});
}
/**
 * Prepare cluster
**/
var prepareCluster = function(){
	return new Promise(function(resolve, reject){
		var forks = [];
		var initForks = function (argument) {
			var numForks = process.env.WEB_CONCURRENCY || require('os').cpus().length;
			console.log('Number of forks: '+ numForks);
			for (var label = 0; label < numForks; label++) {
				createFork(label);
			}
		}
		var createFork = function(label){
			console.log('Creating fork: '+ label);
			var fork = {};
			forks[label] = fork;
			fork.label = label;
			fork.free = false;
			fork.worker = cluster.fork();
			fork.currentWorkerId = fork.worker.id;

			fork.worker.on('message', function(message) {
				if(message.type === 'success'){
					database.setReady(message.data.id, message.data.hex, message.data.error, message.data.size);

					console.log('ask', message.data.worker)
					var fork = forks[message.data.worker];
					if(!fork.worker.isDead()){
						fork.free = true;
						doJob(fork);
					}

				}
				else if(message.type === 'init'){
					console.log('Fork is ready: '+ label);
					var fork = forks[message.data.worker];
					if(!fork.worker.isDead()){
						fork.free = true;
						doJob(fork);
					}
				}
			});

			fork.worker.send({
				type: 'label',
				data: label
			})
		}
		var doJob = function(fork){
			database.getNext()
			.then(function(instance){
				if(!fork.worker.isDead()){
					//console.log('do', fork.label, instance.id)
					fork.free = false;
					fork.worker.send({
						type: 'run',
						data: {
							id: instance.id,
							code: instance.code
						}
					});
				}

			})
		}
		var pushJobs = function(){
			//console.log('*')
			var freeForks = forks.filter(function(fork){
				return fork.free;
			})
			if(freeForks.length){
				database.countPending()
				.then(function(count){
					if(count){
						var pushes = 0;
						forks.forEach(function(fork){
							if(pushes >= count) return;
							if(!fork.free) return;
							pushes++;
							//console.log('push', fork.label)
							doJob(fork)
						})
						//console.log('- job!')
						setTimeout(pushJobs, 300);
					}
					else{
						//console.log('- empty')
						setTimeout(pushJobs, 2000);
					}
				})
				.catch(function(error) {
					//console.log('- error')
					setTimeout(pushJobs, 2000);
				})
			}
			else{
				//console.log('- busy')
				setTimeout(pushJobs, 300);
			}


		}
		cluster.on('exit', function(worker, code, signal) {
			var delay = 5000;
			console.log('worker ' + worker.id + ' died, reviving in ' + delay + 'ms.');
			setTimeout(function() {
				console.log('Searching for fork that owns worker: '+ worker.id);
				var fork;
				Object.keys(forks).forEach(function (label) {
					if(forks[label].currentWorkerId === worker.id){
						fork = forks[label];
					}
				});
				if(fork){
					console.log('Reviving fork: '+ fork.label);
					createFork(fork.label);
				}
				else{
					console.log('Fatal error: could not find worker ' + worker.id );
				}
			}, 5000)
		});

		initForks();
		setTimeout(pushJobs, 100);
		resolve();
	});
};
/**
 * Start application
**/
pass()
.then(setup)
.then(precleanUp)
.then(saveLibraryConfig)
.then(saveHardwareConfig)
.then(compileResetFirmaware)
.then(prepareCluster)
.then(function(){
	console.log('Compiler started sucessfully!');
})
.catch(function(error){
	console.log('Compiler failed', error);
});
