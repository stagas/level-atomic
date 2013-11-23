
/**
 * Example.
 */

var level = require('level');
var atomic = require('./');

var db = atomic(level('./level-test'));

db.lock('foo', function(db, done){
  setTimeout(function(){
    db.put('foo', 'yo', done);
  }, 1000);
});

db.put('foo', 'ahoy');
db.get('foo', function(err, value){
  console.log(value); // => 'ahoy'
});

// example increment by method

db.incr = function(key, n, fn){
  // create a lock for `key`
  db.lock(key, function(db, done){
    // we use the `db` provided by the callback
    // which are the original methods because
    // we call `done()` and unlock manually.
    db.get(key, function(err, value){
      value = Number(value || 0);
      db.put(key, value + n, function(err){
        if (fn) fn(err);
        done();
      });
    });
  });
};

for (var i = 100; i--;) {
  db.incr('num', 1);
}

db.get('num', function(err, value){
  console.log(value); // => 100
});
