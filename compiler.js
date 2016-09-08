// In case this process is being spawned from a parent, make sure to exit
// in case the parent is killed
process.on('disconnect', function() {
	process.exit();
});

"use strict";
if(
	process.env.NEW_RELIC_APP_NAME
	&& process.env.NEW_RELIC_KEY
	&& process.env.NEW_RELIC_LEVEL
) {
	var newrelic = require( 'newrelic' );
}

var cluster = require('cluster');
if (cluster.isMaster){
	require('./master');
}
else{
	require('./fork');
}
