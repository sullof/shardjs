
/*
 * This is a sample of a config file for Redis.
 * For simplicity there are four local instances. 
 */

exports.config = {
		
	shards: {
	    '0': ["63700", "127.0.0.1", 1],
	    '1': ["63701", "127.0.0.1", 1],
	    '2': ["63702", "127.0.0.1", 1],
	    '3': ["63703", "127.0.0.1", 1]
	},

	options: {

// we use the $ to indicate keys with the same name along the shards
//		seqname: "$equence",
		
// 2011-12-13T00:01:00Z	
//		epoch: 1323763260000,
			
		keyTypes: {
				
			index: 0, // multiple hash key
			sorted: 1 // sorted set key	
			
		},
	
		specialKeys: {
				
		/*	
		 *  index: [timestamp,keytype]
		 *  
		 * */	
				
			users: [0,'index'], 
			usernames: [1,'index'],
			emails: [2,'index'],
			finder: [3,'sorted']
		}
	}
};
	
	
	
	
