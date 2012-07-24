/*!
 * Shard-Redis version 0.3.2
 * July 23th, 2011
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
		if (this._auth && this._auth.password)
			rc.auth(this._auth.password,function () {console.log("Connected!");});
		rc.on('error', function (err) {
		    console.log('Error on client '+ sn + ': ' + err);
		});
		return rc;
	},
	
	_addVariant: function (pars,quantity,callback) {
		var thiz = this,
			rc = this._clientInit(pars.s);
		if (quantity == 1)
			rc.incr(this._seqname,function (err, val) {
				pars.v = val % thiz._variants;
				callback(pars);
			});
		else 
			rc.incrby(this._seqname,quantity,function (err, val) {
				ret = [];
				for (var j=0;j<quantity;j++) {
					pars.v = (val-j) % thiz._variants;
					ret[j] = thiz._copy(pars);
				}
				callback(ret);
			});
	}
	
});

