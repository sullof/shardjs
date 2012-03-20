## Shardjs

A module to manage keys along a shard of up to 3844 nodes inspired 
by [this Instagram article](http://instagram-engineering.tumblr.com/post/10853187575/sharding-ids-at-instagram).


## Alert 
__Shardjs is at a very Alpha stage, use at your own risk.__

__The version 0.2 is not compatible with previous versions. Till now, I seem that nobody started to use Shardjs so 
I think that this won't create problems. Please, if you start to use Shardjs in some project, let me now
so that I will consider smooth transitions in the future. If not, as you can guess, it is better to improve 
the library without caring about backward compatibility.__


## Features

 * fixed/special keys
 * generated time sorted keys
 * re-sharding of the keys
 * key types
 
## The key format

Shardjs uses integer in base 62 (like url shortener) since Javascript is not able to correctly manage 64-bit integers.


The key `2T4QmCrM03` is made up of 3 parts: `2T4QmC` `rM` `03`


`2T4QmC` is the difference between the current timestamp in milliseconds and the starting epoch (by default Jan. 1st 2012). 

`rM` is a variance on the single shard, managed with a sequence.

`03` is the key type.


## Why the keys are unique

`Date.now()` produces the milliseconds from Jan. 1st, 1970.
If our epoch starts at Jan. 1st 2012, our epoch is 1325404800000.
Today, Jan. 19th 2012, the diff is

    1327000287784 - 1325404800000 = 1595487784
    
So we have a good starting point.
Since it is possible that you generate more keys in the same milliseconds, we need more data.

First of all, we identify what _virtual shard_ will host that key with `1595487784 % N` (where N is the number of current nodes).
After we use a sequence (Shardjs defines the special key `$equence` in Redis) in order to have a incremental unique number for that shard.

Imagine that we have two keys of the same type 01 generated at the same millisecond in a shard of 64 nodes.
The two keys will be assigned, with `1595487784 % 64` to the virtual node 40.

If the sequence value at that time is, for example, 190, the partial first key will be

	1595487784 190 01
	
the second, after incrementing the sequence, will be

	1595487784 191 01
	
Converting these keys in base 62 we will obtain the final keys `1jyVFw3401` and `1jyVFw3501`.

The advantage of this approach is that since all the keys generated at the same millisecond will go on the same virtual shard and there is the incremental sequence, 
we can mantain the key well sorted by time (except when the variant is close to multiples of 3844).

But the key won't go on the virtual shard defined using mod operator, it is necessary only to decide what shard's sequence we need to use.

## Consistent hashing

Shardjs, after the first virtual sharding, define the real shard that will host the key using [node-hash-ring](https://github.com/bnoguchi/node-hash-ring) by [Brian Noguchi](https://github.com/bnoguchi). 

The advantage of using consistent hashing is that if you have a database with 20 nodes and you add other 2 nodes, you will move only the 10% of the keys to the new nodes.

## Usage

Before all, you have to install Class-js and HashRing using

    npm install class-js
    npm install hash_ring

### Require the module

    var Shard = require('./lib/shardjs-redis').init(shardjs-config);

This is a sample of shard-config file, using 4 local instances of Redis, with a different weight (in real cases, this can be due to the available RAM):

	exports.config = {
			
		shards: {
		    '0': ["63700", "127.0.0.1", 1],
		    '1': ["63700", "127.0.0.2", 2],
		    '2': ["63700", "127.0.0.3", 1],
		    '3': ["63800", "127.0.0.4", 4]
		},
	
		options: {
	
	// we use the $ to indicate keys with the same name along the shards
			seqname: "$equence",
			
	// Jan. 1st, 2012		
			epoch: 1325404800000,
				
			keyTypes: {
				index: 0, // multiple hash key
				sorted: 1, // sorted set key
				user: 2,
				group: 3,
				comment: 4,
				like: 5	
			},
		
			specialKeys: {
			/*	
			 *  index: [timestamp,keytype]
			 */	
				users: [0,'index'], 
				usernames: [1,'index'],
				emails: [2,'index'],
				groups: [3,'index'],
				comments: [4,'index'],
				likes: [5,'index'],
				search: [6,'sorted']
			}
		}
	};

It will generate special keys like, in the third case `020000-emails`		
		
To generate a key:

	Shard.genKey(Shard.keyTypes["users"],function (key) {
		do_something(key);
	});		
	
If you don't explicitly declare a key type Shardjs assumes that you use a default $DEF type, that has the numberic value 3843 (the bigger available).

The command

	Shard.getClient(key)
	
returns a redis client that supports all the Redis commands supported by [node-redis](https://github.com/mranney/node_redis/) by [Matt Ramney](https://github.com/mranney).

So you can apply any redis command. For example, to save the key with a value:

	Shard.getClient(key).hset(key,'value');
	
	// and to get a hashed key:

	Shard.getClient(key).hget(key,callback);
	
To know where a key is:

	Shard.whereIs(key);
	
To know on what virtual shard a key is (from 0.2.3 -- useful in tests):

	Shard.whereIs(key,true);	

To get the decimal string of a key:

	Shard.toDecimalString(key);
	
To create a fixed key (for example the special keys in the shard-config file):

	Shard.fixedKey(timestamp,variant,keytype,suffix);
	
To change the key type, for example to associate a token to a user:

	Shard.changeKeyType(user_key,Shard.keyTypes.token);

or

	Shard.changeKeyType(user_key,'token');
	
Be careful, this requires that you have set a special key `token` in your shard-config file.

Other useful method are `.getType` and `.getTime` to have info about the key.

## All the dependencies

Shardjs depends on:

- [class-js](https://github.com/bnoguchi/class-js)
- [node-hash-ring](https://github.com/bnoguchi/node-hash-ring)
- [node-redis](https://github.com/mranney/node_redis/) (for Shardjs-redis)
			
## Credits

Shardjs is (c) Francesco Sullo <me@sullof.com>

## License 

(The MIT License)

Copyright (c) 2012 Francesco Sullo <me@sullof.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.	