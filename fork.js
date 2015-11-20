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
var _compileCommandCache;
var _linkCommandCache;
var _copyCommandCache;
var _cacheCompileCommand = function () {
	_compileCommandCache =
		path.resolve('node_modules', 'npm-arduino-avr-gcc', 'tools', 'avr', 'bin', 'avr-g++')+ ' '+
		'-x c++ ' +
		'-c ' +
		'-g ' +
		'-Os ' +
		'-w ' +
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
		path.resolve('.tmp', '{{id}}' + '.cpp') + ' ' +
		'-o ' + path.resolve('.tmp', '{{id}}' + '.cpp.o')
	_compileCommandCache = _compileCommandCache.split('{{id}}');
}
_cacheCompileCommand();
var _cacheLinkCommand = function () {
	pass()
	.then(findFiles(path.resolve('.tmp', 'libraries'), '.o'))
	.then(function (list) {
		_linkCommandCache =
			path.resolve('node_modules', 'npm-arduino-avr-gcc', 'tools', 'avr', 'bin', 'avr-gcc')+ ' '+
			'-mmcu='+boardSettings['quirkbot.build.mcu']+' ' +
			'-Wl,--gc-sections ' +
			'-w ' +
			'-Os ' +
			'-o ' +
			path.resolve('.tmp', '{{id}}' + '.cpp.elf') + ' ' +
			path.resolve('.tmp', '{{id}}'+ '.cpp.o') + ' ';
		list.forEach(function (object) {
			_linkCommandCache += object + ' ';
		});
		_linkCommandCache +=
			path.resolve('.tmp', 'core',  'core.a') + ' ' +
			'-L' + path.resolve('.tmp') + ' ' +
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
	path.resolve('.tmp', '{{id}}' + '.cpp.elf') + ' ' +
	path.resolve('.tmp', '{{id}}' + '.cpp.hex');
	_copyCommandCache = _copyCommandCache.split('{{id}}');
}
_cacheCopyComand();

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
		.then(compile)
		.then(link)
		.then(objCopy)
		.then(readFile(path.resolve('.tmp', sketch._id + '.cpp.hex')))
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
		execute('rm ' + path.resolve('.tmp', sketch._id + '.cpp'))()
		execute('rm ' + path.resolve('.tmp', sketch._id + '.cpp.hex'))()
		execute('rm ' + path.resolve('.tmp', sketch._id + '.cpp.o'))()
		execute('rm ' + path.resolve('.tmp', sketch._id + '.cpp.elf'))()
		execute('rm ' + path.resolve('.tmp', sketch._id + '.cpp.d'))()

		resolve(sketch);
	};
	return new Promise(promise);
}
// Level1 ----------------------------------------------------------------------
var create = function(sketch){
	var promise = function(resolve, reject){
		pass()
		.then(writeFile(path.resolve('.tmp', sketch._id + '.cpp'), sketch.code )())
		.then(function(){
			resolve(sketch)
		})
		.catch(reject)
	}
	return new Promise(promise);
}
var compile = function(sketch){
	var promise = function(resolve, reject){
		var command = _compileCommandCache.join(sketch._id);
		pass()
		.then(execute(command))
		.then(function(){
			resolve(sketch)
		})
		.catch(reject)
	}
	return new Promise(promise);
}
var link = function(sketch){
	var promise = function(resolve, reject){
		var command = _linkCommandCache.join(sketch._id);
		pass()
		.then(execute(command))
		.then(function(){
			resolve(sketch)
		})
		.catch(reject)
	}
	return new Promise(promise);
}
var objCopy = function(sketch){
	var payload = arguments;

	var promise = function(resolve, reject){
		var command = _copyCommandCache.join(sketch._id);
		pass()
		.then(execute(command))
		.then(function(){
			resolve(sketch)
		})
		.catch(reject)
	}
	return new Promise(promise);
}
