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
var boardSettings = require('./boardSettings').settings;
// Cache the commands ----------------------------------------------------------
var _compileSketchCommandCache;
var _compileCoreCommandCache;
var _linkCommandCache;
var _copyCommandCache;
var _cacheCompileSketchCommand = function () {
	_compileSketchCommandCache =
		path.resolve('node_modules', 'npm-arduino-avr-gcc', 'tools', 'avr', 'bin', 'avr-g++')+ ' '+
		'-x c++ ' +
		'-c ' +
		'-g ' +
		'-Os ' +
		'-w ' +
		'-std=gnu++11 ' +
		'-ffunction-sections ' +
		'-fno-exceptions ' +
		'-fdata-sections ' +
		'-fno-threadsafe-statics ' +
		'-MMD ' +
		'-mmcu='+boardSettings['quirkbot.build.mcu']+' ' +
		'-DF_CPU='+boardSettings['quirkbot.build.f_cpu']+' ' +
		'-DARDUINO_'+boardSettings['quirkbot.build.board']+' ' +
		'-DARDUINO=10600 ' +
		'-DARDUINO_ARCH_AVR ' +
		'-DUSB_VID='+boardSettings['quirkbot.build.vid']+' ' +
		'-DUSB_PID='+boardSettings['quirkbot.build.pid']+' ' +
		'-DUSB_MANUFACTURER='+boardSettings['quirkbot.build.usb_manufacturer']+' ' +
		'-DUSB_PRODUCT='+boardSettings['quirkbot.build.usb_product']+' ' +
		((boardSettings['quirkbot.build.core']) ?
			'-I' + path.resolve('node_modules', 'quirkbot-arduino-hardware', 'avr', 'cores', boardSettings['quirkbot.build.core']) : '') + ' ' +
		((boardSettings['quirkbot.build.variant']) ?
			'-I' + path.resolve('node_modules', 'quirkbot-arduino-hardware', 'avr', 'variants', boardSettings['quirkbot.build.variant']) : '') + ' ' +
		'-I' + path.resolve('node_modules', 'quirkbot-arduino-library', 'src') + ' ' +
		'-I' + path.resolve('node_modules', 'quirkbot-arduino-hardware', 'avr', 'libraries', 'HID') + ' ' +
		'-I' + path.resolve('node_modules', 'quirkbot-arduino-hardware', 'avr', 'libraries', 'Keyboard', 'src') + ' ' +
		'-I' + path.resolve('node_modules', 'quirkbot-arduino-hardware', 'avr', 'libraries', 'Mouse', 'src') + ' ' +
		'-I' + path.resolve('node_modules', 'quirkbot-arduino-hardware', 'avr', 'libraries', 'Servo', 'src') + ' ' +
		path.resolve('.tmp-sketches', '{{id}}' + '.ino') + ' ' +
		'-o ' + path.resolve('.tmp-build', '{{id}}' + '.ino.o')
	_compileSketchCommandCache = _compileSketchCommandCache.split('{{id}}');
}
_cacheCompileSketchCommand();
var _cacheCompileCoreCommand = function () {
	pass()
	.then(findFiles(path.resolve('.tmp-build', 'core'), '.o'))
	.then(function (list) {
		_compileCoreCommandCache = '';
			/*path.resolve('node_modules', 'npm-arduino-avr-gcc', 'tools', 'avr', 'bin', 'avr-gcc')+ ' '+
			'-c ' +
			'-g ' +
			'-x ' +
			'assembler-with-cpp ' +
			'-mmcu='+boardSettings['quirkbot.build.mcu']+' ' +
			'-DF_CPU='+boardSettings['quirkbot.build.f_cpu']+' ' +
			'-DARDUINO=10600 ' +
			'-DARDUINO_'+boardSettings['quirkbot.build.board']+' ' +
			'-DARDUINO_ARCH_AVR ' +
			'-DUSB_VID='+boardSettings['quirkbot.build.vid']+' ' +
			'-DUSB_PID='+boardSettings['quirkbot.build.pid']+' ' +
			'-DUSB_MANUFACTURER='+boardSettings['quirkbot.build.usb_manufacturer']+' ' +
			'-DUSB_PRODUCT='+boardSettings['quirkbot.build.usb_product']+' ' +
			((boardSettings['quirkbot.build.core']) ?
				'-I' + path.resolve('node_modules', 'quirkbot-arduino-hardware', 'avr', 'cores', boardSettings['quirkbot.build.core']) : '') + ' ' +
			((boardSettings['quirkbot.build.variant']) ?
				'-I' + path.resolve('node_modules', 'quirkbot-arduino-hardware', 'avr', 'variants', boardSettings['quirkbot.build.variant']) : '') + ' ' +
			path.resolve('node_modules', 'quirkbot-arduino-hardware', 'avr', 'cores', boardSettings['quirkbot.build.core'], 'wiring_pulse.S') + ' ' +
			'-o ' + path.resolve('.tmp-build', 'core_{{id}}_wiring_pulse.S.o') +'\n';*/

		list.forEach(function (object) {

			_compileCoreCommandCache +=
				path.resolve('node_modules', 'npm-arduino-avr-gcc', 'tools', 'avr', 'bin', 'avr-ar')+ ' '+
				'rcs ' +
				path.resolve('.tmp-build', 'core_{{id}}_core.a')+ ' ';

			//if(object.indexOf('wiring_pulse.S.o') == -1){
				_compileCoreCommandCache += object + '\n';
			//}
			//else {
			//	_compileCoreCommandCache += path.resolve('.tmp-build', 'core_{{id}}_wiring_pulse.S.o') + '\n';
			//}

		});

		_compileCoreCommandCache = _compileCoreCommandCache.split('{{id}}');
	})
	.catch(function (error) {
		console.log('Error build libraries object cache', error);
	});

}
_cacheCompileCoreCommand();
var _cacheLinkCommand = function () {
	pass()
	.then(findFiles(path.resolve('.tmp-build', 'libraries'), '.o'))
	.then(function (list) {
		_linkCommandCache =
			path.resolve('node_modules', 'npm-arduino-avr-gcc', 'tools', 'avr', 'bin', 'avr-gcc')+ ' '+
			'-mmcu='+boardSettings['quirkbot.build.mcu']+' ' +
			'-Wl,--gc-sections ' +
			'-w ' +
			'-Os ' +
			'-o ' +
			path.resolve('.tmp-build', '{{id}}' + '.ino.elf') + ' ' +
			path.resolve('.tmp-build', '{{id}}'+ '.ino.o') + ' ';
		list.forEach(function (object) {
			_linkCommandCache += object + ' ';
		});
		_linkCommandCache +=
			path.resolve('.tmp-build', 'core_{{id}}_core.a') + ' ' +
			'-L' + path.resolve('.tmp-build') + ' ' +
			'-lm';
		_linkCommandCache = _linkCommandCache.split('{{id}}');
	})
	.catch(function (error) {
		console.log('Error build libraries object cache', error);
	});
}
_cacheLinkCommand();
var _cacheCopyComand = function () {
	_copyCommandCache =
	path.resolve('node_modules', 'npm-arduino-avr-gcc', 'tools', 'avr', 'bin', 'avr-objcopy')+ ' '+
	'-O ' +
	'ihex ' +
	'-R ' +
	'.eeprom ' +
	path.resolve('.tmp-build', '{{id}}' + '.ino.elf') + ' ' +
	path.resolve('.tmp-build', '{{id}}' + '.ino.hex');
	_copyCommandCache = _copyCommandCache.split('{{id}}');
}
_cacheCopyComand();

var _arduinoBuildCache;
var _cacheArduinoBuild = function () {
	_arduinoBuildCache =
		path.resolve('node_modules', 'npm-arduino-builder', 'arduino-builder', 'arduino-builder') + ' ' +
		'-hardware="' + path.resolve('node_modules') + '" ' +
		'-hardware="' + path.resolve('node_modules', 'npm-arduino-builder', 'arduino-builder', 'hardware') + '" ' +
		'-libraries="' + path.resolve('node_modules') + '" ' +
		'-tools="' + path.resolve('node_modules', 'npm-arduino-avr-gcc', 'tools') + '" ' +
		'-tools="' + path.resolve('node_modules', 'npm-arduino-builder', 'arduino-builder', 'tools') + '" ' +
		'-fqbn="quirkbot-arduino-hardware:avr:quirkbot" ' +
		'-build-path="' + path.resolve('.tmp-build') + '" ' +
		'-verbose ' +
		path.resolve('.tmp-sketches', '{{id}}' + '.ino') ;
	_arduinoBuildCache = _arduinoBuildCache.split('{{id}}');
}
_cacheArduinoBuild();

// Interface -------------------------------------------------------------------
var label;
var run = function(id, code){
	if(typeof label === 'undefined' || typeof id === 'undefined' ) return;

	//console.log('run', label, id)
	var sketch = {
		_id: id,
		code: code
	}
	var now = Date.now();
	pass(sketch)
	.then(build)
	.then(function(){
		console.log('success', label, id, Date.now() - now)
		process.send({
			type: 'success',
			data:{
				worker: label,
				id: sketch._id,
				hex: sketch.hex,
				error: sketch.error
			}
		})
	})
	.catch(function(){
		console.log('fail', label, id, Date.now() - now, arguments)
		process.send({
			type: 'fail',
			data:{
				worker: label,
				id: sketch._id,
				hex: sketch.hex,
				error: sketch.error
			}
		})
	})
}
process.on('message', function(message) {
	if(message.type == 'label'){
		console.log('Fork created: ' +  message.data);
		label = message.data;
	}
	else if(message.type == 'run'){
		run(message.data.id,message.data.code);
	}
});

// Level0 ----------------------------------------------------------------------
var build = function(sketch){
	var promise = function(resolve, reject){
		pass(sketch)
		.then(compileProcess)
		.then(clear)
		.then(resolve)
		.catch(reject)
	}
	return new Promise(promise)
}
// Level1 ----------------------------------------------------------------------
var compileProcess = function(sketch){
	var promise = function(resolve, reject){
		pass(sketch)
		.then(create)
		.then(executeCommandCache(_compileSketchCommandCache))
		.then(executeCommandCache(_compileCoreCommandCache))
		.then(executeCommandCache(_linkCommandCache))
		.then(executeCommandCache(_copyCommandCache))
		//.then(executeCommandCache(_arduinoBuildCache))
		.then(readFile(path.resolve('.tmp-build', sketch._id + '.ino.hex')))
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
}
var clear = function(sketch){
	var promise = function(resolve, reject){
		execute('rm ' + path.resolve('.tmp-sketches', sketch._id + '.ino'))();
		execute('rm ' + path.resolve('.tmp-build', sketch._id + '.ino.hex'))();
		execute('rm ' + path.resolve('.tmp-build', sketch._id + '.ino.o'))();
		execute('rm ' + path.resolve('.tmp-build', sketch._id + '.ino.elf'))();
		execute('rm ' + path.resolve('.tmp-build', sketch._id + '.ino.d'))();
		execute('rm ' + path.resolve('.tmp-build', 'core_' + sketch._id + '_core.a'))();
		execute('rm ' + path.resolve('.tmp-build', 'core_' + sketch._id + '_wiring_pulse.S.o'))();

		resolve(sketch);
	};
	return new Promise(promise);
}
// Level1 ----------------------------------------------------------------------
var create = function(sketch){
	var promise = function(resolve, reject){
		pass()
		.then(writeFile(path.resolve('.tmp-sketches', sketch._id + '.ino'), sketch.code )())
		.then(function(){
			resolve(sketch)
		})
		.catch(reject)
	}
	return new Promise(promise);
}
var executeCommandCache = function (commandCache) {
	return function(sketch){
		var promise = function(resolve, reject){
			var command = commandCache.join(sketch._id);
			//console.log(command);
			pass()
			.then(execute(command))
			.then(function(result){
				if(result.stderr){
					console.log('ERR:\t'+result.stderr);
				}
				resolve(sketch)
			})
			.catch(reject)
		}
		return new Promise(promise);
	};
};