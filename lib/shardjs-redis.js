/*!
 * Shard-Redis version 0.3.1
 * January 19th, 2011
 * (c) Francesco Sullo, sullof@sullof.com
 * Released under MIT Licence
 *
 * Redis subclass for Shard-js
 * 
 */

var Class = require('class-js'),
	redis = require('redis'),
	Shard = require('./shardjs');
		
module.exports = Shard.subclass({
	
	init: function (shards, options) {
		
		this._super(shards,options);
		this.native = redis;
	},
	
	_createClient: function (sn,port,ip) {
		var rc = redis.createClient(port,ip);
		rc.on('error', function (err) {
		    console.log('Error on client '+ sn + ': ' + err);
		});
		return rc;
	},
	
	_addVariant: function (pars,callback) {
		var thiz = this,
			rc = this._clientInit(pars.s);
		rc.incr(this._seqname,function (err, val) {
			pars.v = val % thiz._variants;
			callback(pars);
		});
	}
	
//	,
//	
//	rename: function (old,New) {
//		var c = this.getClient(old);
//		c.exists(old,function (err,val) {
//			if (val) c.rename(old,New);
//		});
//	}

	
});

