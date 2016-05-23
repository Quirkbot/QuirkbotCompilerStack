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
