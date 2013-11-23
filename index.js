
/*!
 *
 * level-atomic
 *
 * obtain locks for atomic levelup transactions
 *
 * MIT
 *
 */

/**
 * Module dependencies.
 */

var atomic = require('atomic');
var slice = [].slice;

/**
 * Patch `db` for atomic transactions.
 *
 * @param {LevelUP} db
 * @return {LevelUP}
 * @api public
 */

module.exports = function(db){
  var lock = atomic();

  // inner (undecorated, lock-free methods)

  var inner = {
    put: db.put.bind(db),
    get: db.get.bind(db),
    del: db.del.bind(db)
  };

  /**
   * Obtain a lock for `key`.
   *
   * `fn` is called with `(inner, done)`
   * where `inner` is the lock-free versions
   * of `put`, `get` and `del` so we can have
   * multiple calls, then call `done()` manually.
   *
   * @param {String} key
   * @param {Function} fn
   * @api public
   */

  db.lock = function(key, fn){
    lock(key, function(done){
      fn(inner, done);
    });
  };

  // decorate db methods to use locks

  db.put = decorate(db.put);
  db.get = decorate(db.get);
  db.del = decorate(db.del);

  return db;

  /**
   * Decorate `method` to use the lock.
   *
   * @param {Function} method
   * @return {Function}
   * @api public
   */

  function decorate(method){
    return function(key){
      var args = slice.call(arguments);

      var fn = args[args.length - 1];
      if ('function' == typeof fn) {
        args.pop();
      }
      else fn = function(){};

      lock(key, function(done){
        args.push(function(){
          done();
          fn.apply(this, arguments);
        });
        method.apply(db, args);
      });
    };
  }
};
