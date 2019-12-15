const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');
const redisUrl = 'redis://127.0.0.1:6379';
const client = redis.createClient(redisUrl);
const exec = mongoose.Query.prototype.exec;
client.hget=util.promisify(client.hget);

mongoose.Query.prototype.cache = function(options = {}) {
     this.useCache = true;
     this.hashKey = JSON.stringify(options.key || '');
     console.log(this.hashKey)
     return this;
}
mongoose.Query.prototype.exec = async function() {
     if(!this.useCache) {
          console.log('Without cache')
          return exec.apply(this, arguments)
     } 
     const key = JSON.stringify(Object.assign({},this.getQuery(),{
           collection:this.mongooseCollection.name
     }));
     
     //See if we have value for 'key' in reddis
     console.log(key)
     const cacheValue = await client.hget(this.hashKey,key)
     console.log(cacheValue)
     

     //If we do, return that
      if(cacheValue) {
           console.log("dinesh");
           const doc =JSON.parse(cacheValue);      
           console.log(doc)
           

           return Array.isArray(doc) 
           ?  doc.map(d=> new this.model(d))
           :  new this.model(doc) 

      }
     //Otherwise, issue the query and store the result in redis
     const result =await exec.apply(this,arguments);
     client.hmset(this.hashKey,key, JSON.stringify(result),'EX',10);
     return result;
}