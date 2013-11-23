
/**
 * Test.
 */

var assert = require('assert');

var level = require('level');
var atomic = require('../');

var dbpath = __dirname + '/level-test';
var db;

beforeEach(function(done){
  db = level(dbpath, done);
})

afterEach(function(done){
  db.close(function(){
    level.destroy(dbpath, done);
  });
})

describe("atomic(db)", function(){

  it("should patch db and return it", function(){
    var x = atomic(db);
    x.should.equal(db);
    db.should.have.property('lock');
  })

})

describe("when methods are called in the same tick", function(){

  it("they should be processed serially", function(done){
    atomic(db);
    var count = 0;
    db.put('foo', 'hey');
    db.put('foo', 'there');
    db.get('foo', function(err, value){
      count++;
      value.should.equal('there');
    });
    db.del('foo');
    db.get('foo', function(err, value){
      count++;
      count.should.equal(2);
      assert(err);
      err.type.should.equal('NotFoundError');
    });
    db.put('foo', 'bar');
    db.put('foo', 'zoo');
    db.get('foo', function(err, value){
      count++;
      value.should.equal('zoo');
      count.should.equal(3);
      done();
    });
  })

})

describe("lock()", function(){

  it("should create a lock", function(done){
    atomic(db);
    var count = 0;
    db.lock('foo', function(db, done){
      setTimeout(function(){
        count++;
        count.should.equal(1);
        db.put('foo', 'yo', done);
      }, 500);
    });
    db.get('foo', function(err, value){
      count++;
      count.should.equal(2);
      value.should.equal('yo');
    })
    db.put('foo', 'ahoy');
    db.get('foo', function(err, value){
      count++;
      count.should.equal(3);
      value.should.equal('ahoy');
      done();
    });
  })

  it("should hold that lock until released", function(done){
    atomic(db);

    db.incr = function(key, n, fn){
      db.lock(key, function(db, done){
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
      value.should.eql(100);
      done();
    });
  })

})
