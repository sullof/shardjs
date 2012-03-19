/*!
 * Shard-js version 0.2.2
 * March 19th, 2012
 * (c) Francesco Sullo, sullof@sullof.com
 * Released under MIT Licence
 *
 * Shard-js manages re-shardable IDs for up to 3844 shards.
 * 
 */

var Class = require('class-js');
var HashRing = require('hash_ring');
		
module.exports = Class.subclass({
	
	// the native db client:
	native: null,
	
	// the hashring object
	_ring: null,
	_ring2rc : {},
	
	_keystr: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
	_strlen: 62,
	_variants: 62*62,
	_zeros: 2,
	_size: 0,
	
	_client: [],

	_seqname: '$EQUENCE',
	
	// Jan. 1st 2012
	_epoch: 1325404800000,
	
	keyTypes: {},
	specialKeys: {},
	
	init: function (config) {
		var shards = this.shards = config.shards,
			opt = config.options || {},
			hr = {};
			
		for (var j in shards) {
			var v = shards[j][1]+":"+shards[j][0];
			hr[v] = shards[j][2];
			this._ring2rc[v] = j;
			this._size++;
		}
		
		this._ring = new HashRing(hr);
		
		if (opt.epoch && opt.epoch < Date.now()) this._epoch = opt.epoch;
		if (opt.seqname) this._seqname = opt.seqname;

		// set special keys (indexes, etc.)
		var keyTypes = opt.keyTypes || {};
		//default key
		keyTypes['$DEF'] = this._variants-1;
		
		for (j in keyTypes)
			if (!this.addKeyType(j,keyTypes[j]))
				console.log("Error creating keytype "+j);
		
		var specialKeys = opt.specialKeys || {};
		for (j in specialKeys)
			if (!this.addSpecialKey(j,specialKeys[j]))
				console.log("Error creating special key "+j);
		
//		console.log(JSON.stringify(this.keyTypes));
//		console.log(JSON.stringify(this.specialKeys));
	},
	
	addKeyType: function (key,val) {
		/*
		 * return:
		 * 1 ok
		 * -1 already exists
		 * 0 error 
		 */
		for (var j in this.keyTypes)
			if (j == key) return -1;
			else if (this.keyTypes[j] == val) return 0;
		this.keyTypes[key] = val;
		return 1;
	},

	addSpecialKey: function (key,val) {
		/*
		 * return:
		 * 1 ok
		 * -1 already exists
		 * 0 error 
		 */
		for (var j in this.specialKeys)
			if (j == key) return -1;
		var kt = this.keyTypes[val[1]];
		if (typeof kt !== 'number') return 0;
		this.specialKeys[key] = this.fixedKey(val[0],0,kt,key);
		return 1;
	},
	
	zeroFill: function (n,z) {
		var l = z || this._zeros,
			r = n.toString(),
			d = l-r.length;
		for (var j=0;j<d;j++) r = "0"+r;
		return r;	
	},
	
	_clientInit: function (s) {
		var sn = s.toString();
		if (!this._client[sn]) {
			var shard = this.shards[sn];
			if (!shard) {
				console.log("Error asking for shard #"+s);
				return null;
			}
			this._client[sn] = this._createClient(sn,shard[0],shard[1]);
		}
		return this._client[sn];
	},
	
	_createClient: function (sn,port,ip) {
		// this should return the client
		return {};
	},
	
	isInt62: function (s) {
		var re = new RegExp("[^"+this._keystr+"]");
		if (!s || re.test(s)) return false;
		return true;
	},
	
	fixInt62: function (s) {
		var re = new RegExp("[^"+this._keystr+"]*",'g');
		return (s||'').toString().replace(re,'');
	},
	
	toInt62: function (x,z) {
		if (!x) return (z ? this.zeroFill(0,z) : "0");
		var ret = "";
		while (x > 0) {
			var p = x % this._strlen;
			ret = this._keystr.substring(p,p+1) + ret;
			x = Math.floor(x/this._strlen);
		}
		if (z) ret = this.zeroFill(ret, z);
		return ret;
	},
	
	fromInt62: function (x) {
		if (!x) return 0;
		var ret = 0;
		for (var j = x.length; j; j--) {
			var p = -1 * (j - x.length);
			ret += this._keystr.indexOf(x.substring(p,p+1)) * Math.pow(this._strlen,j-1);
		}
		return ret;
	},

	_nullfunc: function (){},

	genKey: function (ktype,cb) {
		
		var thiz = this,
			// milliseconds from epoch:
			m = Date.now() - this._epoch,
			n = this._size,
			pars = {
				m: m,
				s: m % n,
				t: typeof ktype == 'number' && ktype > -1 && ktype < this._variants-1 ? ktype : this._variants-1
			},
			callback = cb || this._nullfunc;
		
			
		this._addVariant(pars,function (pars) {
			var k = thiz.toInt62(pars.m) 
				+ thiz.toInt62(pars.v,2) 
				+ thiz.toInt62(pars.t,2);
			callback(k);
		});
	},
	
	_pseudoVals: {},
	
	_pseudoVariant: function (pars,callback) {
		var pv = this._pseudoVals,
			s = pars.s.toString();
		if (!pv[s]) pv[s] = 0;
		pv[s]++;
		pars.v = pv[s] % this._variants;
		callback(pars);
	},
	
	_addVariant: function (pars,callback) {
		// this should be substituted 
		// using sequences in the database
		this._pseudoVariant(pars,callback);
	},
	
	fixedKey: function (ts,variant,ktype,suffix) {
		// the parameter onfirst forces the key to be on the first shard in an hypothetical database with only 1 node
		
		if (variant >= this._variants) variant = variant % this._variants;
		var m = this.toInt62(ts,2) 
			+ this.toInt62(variant,2) 
			+ this.toInt62(ktype,2)
			+ (suffix ? '-' + this.fixInt62(suffix) : '');
		return m;
	},
	
	_arrange: function (k) {
		k = typeof k == 'Object' ? k : k.split("-");
		var key = k[0],
			l = key.length;
		return { 
			m: this.fromInt62(key.substring(0,l-4)),
		    v: this.fromInt62(key.substring(l-4,l-2)),
		    t: this.fromInt62(key.substring(l-2,l)),
		    x: k[1] || ''
		};
	},
	
	changeKeyType: function (key,newtype) {
		if (typeof newtype != 'number') newtype = this.keyTypes[newtype] || this._variants-1;
		return key.substring(0,key.length-2) + this.toInt62(newtype,2);
	},
	
	toDecimalString: function (key) {
		// If you try to convert it to an integer width this.fromInt62(key)
		// you will fail because it would be a 62-bit integer that is
		// not managed by Javascript
		var K = this._arrange(key);
		return K.m + this.zeroFill(K.v,4) + this.zeroFill(K.t,4);
	},
	
	getShard: function (key) {
		// This verifies the key and return the shard that hosts the the key
        var k = (key||'').toString()
        	// subkey after -
        	.split("-")[0];
        
		if (/[^0-9A-Za-z]/.test(k) || k.length < 5) return -1;
		
		return this._ring2rc[this._ring.getNode(k)] || -1;
		
	},
		
	whereIs: function (key,returnError) {
		var s = this.getShard(key);
		if (s == -1) {
			console.log("Bad key: "+key);
			// to avoid errors return the first shard:
			if (returnError) return -1;
			return 0;
		}
		return s;
	},
	
	getType: function (key,verify) {
		if (typeof key == 'string') {
			key = key.split("-")[0];
			var l = key.length;
			key = this.fromInt62(key.substring(l-2,l));
		}
		for (var j in this.keyTypes)
			if (key == this.keyTypes[j]) {
				return j;
			}
		return '';
	},
	
	getTime: function (key) {
		if (typeof key == 'string') {
			var l = key.length;
			key = this.fromInt62(key.substring(0,l-4));
		}
		return key + this._epoch;
	},
		
	getClient: function (key) {
		return this._clientInit(this.whereIs(key));
	}
	
});

