var adapter;
if(process.env.NODE_ENV === 'lite') {
	adapter = require('./database-diskdb.js')
}
else {
	adapter = require('./database-mongoose.js')
}

exports.create = adapter.create;
exports.countPending = adapter.countPending;
exports.getNext = adapter.getNext;
exports.setReady = adapter.setReady;
exports.extract = adapter.extract;
exports.clearOld = adapter.clearOld;
exports.truncate = adapter.truncate;
exports.setConfig = adapter.setConfig;
exports.getConfig = adapter.getConfig;
exports.removeConfig = adapter.removeConfig;