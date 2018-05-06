// In case this process is being spawned from a parent, make sure to exit
// in case the parent is killed
process.on('disconnect', function() {
	process.exit();
});

var cluster = require('cluster');
if (cluster.isMaster){
	require('./master');
}
else{
	require('./fork');
}
