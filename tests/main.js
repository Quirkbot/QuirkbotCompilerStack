//var SERVER = "https://quirkbot-compiler.herokuapp.com";
var SERVER = "http://localhost:8080";

var _request = function(url){
	return function(){
		var payload = arguments;
		var promise = function(resolve, reject){
			var headers = {}

			var start = Date.now();
			$.ajax({
				url: url,
				success : function (e, status, req) {
					var end = Date.now();
					var _e = e;
					if(! getParameterByName('text')){
						_e = JSON.stringify(e,null, "\t");
					}
					if(!getParameterByName('silent')){
						console.log('%cREQUEST', 'background: #0A0; color: #fff');
						console.log(url);
						console.log('%clatency: ' + (end - start), 'color: #999');
						console.log(_e)
					}

					resolve(e)

				},
				error: function (e, status, req) {
					var end = Date.now();
					var _e = e;
					if(! getParameterByName('text')){
						_e = JSON.stringify(e,null, "\t");
					}
					if(!getParameterByName('silent')){
						console.log('%cREQUEST', 'background: #A00; color: #fff');
						console.log(url);
						console.log('%clatency: ' + (end - start), 'color: #999');
						console.log(_e)
					}
					resolve(e)
				}
			});
		}
		return new Promise(promise);
	}

}
var request = function(url, instant){
	return function(){
		var payload = arguments;

		var promise = function(resolve, reject){
			pass()
			.then(_request(url))
			.then(function(){
				if(!instant) resolve.apply(null, arguments)
			})

			if(instant) resolve.apply(null, payload)
		}
		return new Promise(promise);
	}

}
var requestProgram = function(url, instant){
	return function(){

		var promise = function(resolve, reject){
			pass()
			.then(request(url + '/%2F%2F%20include%20the%20Quirkbot%20library%20to%20your%20program%3A%0A%23include%20%22Quirkbot.h%22%0A%0A%2F%2F%20create%20your%20Quirkbot%20nodes%20here%3A%0AWave%20wave1%3B%0ALed%20led1%3B%0ALed%20led2%3B%0ALed%20led3%3B%0ALed%20led4%3B%0A%0A%2F%2F%20create%20your%20other%20Arduino%20variables%20and%20functions%20here%3A%0A%0Avoid%20setup()%7B%0A%09%2F%2F%20setup%20your%20Quirkbot%20nodes%20here%3A%0A%09wave1.length%20%3D%201%3B%0A%09wave1.type%20%3D%20WAVE_SINE%3B%0A%09wave1.min%20%3D%200%3B%0A%09wave1.max%20%3D%201%3B%0A%09wave1.offset%20%3D%200%3B%0A%0A%09led1.light.connect(wave1.out)%3B%0A%09led1.place%20%3D%20RE%3B%0A%0A%09led2.light.connect(wave1.out)%3B%0A%09led2.place%20%3D%20LE%3B%0A%0A%09led3.light.connect(wave1.out)%3B%0A%09led3.place%20%3D%20LM%3B%0A%0A%09led4.light.connect(wave1.out)%3B%0A%09led4.place%20%3D%20RM%3B%0A%0A%09%2F%2F%20put%20your%20other%20Arduino%20setup%20code%20here%2C%20to%20run%20once%3A%0A%0A%7D%0A%0Avoid%20loop()%7B%0A%09%2F%2F%20put%20your%20main%20Arduino%20code%20here%2C%20to%20run%20repeatedly%3A%0A%0A%7D', instant))
			.then(resolve)
		}
		return new Promise(promise);
	};
}
var requestProgramCC = function(instant){

	return function(){
		var payload = arguments;

		var promise = function(resolve, reject){
			pass()
			.then(requestProgram((getParameterByName('s') || SERVER), instant))
			.then(resolve)
		}
		return new Promise(promise);
	};
}
var requestResult = function(id, instant){
	return function(){

		var promise = function(resolve, reject){
			pass()
			.then(request((getParameterByName('s') || SERVER) + '/i' + id, instant))
			.then(resolve)
		}
		return new Promise(promise);
	};
}
var requestResultFromResponse = function(instant){
	return function(response){
		var promise = function(resolve, reject){
			if(!response._id){
				return reject('fail')
			}
			pass()
			.then(requestResult(response._id, instant))
			.then(resolve)
		}
		return new Promise(promise);
	};
}
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
var pass = function(){
	var payload = arguments;
	var promise = function(resolve, reject){
		resolve.apply(null, payload);
	}
	return new Promise(promise);
}
var log = function(){
	var payload = arguments;
	var promise = function(resolve, reject){
		for (var i = 0; i < payload.length; i++) {
			console.log(payload[i])
		};
		resolve.apply(null, payload);
	}
	return new Promise(promise);
}
var delay = function(millis){
	return function(){
		var payload = arguments;
		var promise = function(resolve, reject){
			setTimeout(function(){
				resolve.apply(null, payload);
			}, millis)

		}
		return new Promise(promise);
	}
}
