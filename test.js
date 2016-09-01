'use strict'

var test = require('tape').test
var from = require('from2')
var sink = require('flush-write-stream')
var cloneable = require('./')

test('basic passthrough', function (t) {
  t.plan(2)

  var read = false
  var source = from(function (size, next) {
    if (read) {
      this.push(null)
    } else {
      read = true
      this.push('hello world')
    }
    next()
  })

  var instance = cloneable(source)
  t.notOk(read, 'stream not started')

  instance.pipe(sink(function (chunk, enc, cb) {
    t.equal(chunk.toString(), 'hello world', 'chunk matches')
    cb()
  }))
})

test('clone sync', function (t) {
  t.plan(4)

  var read = false
  var source = from(function (size, next) {
    if (read) {
      this.push(null)
    } else {
      read = true
      this.push('hello world')
    }
    next()
  })

  var instance = cloneable(source)
  t.notOk(read, 'stream not started')

  var cloned = instance.clone()
  t.notOk(read, 'stream not started')

  instance.pipe(sink(function (chunk, enc, cb) {
    t.equal(chunk.toString(), 'hello world', 'chunk matches')
    cb()
  }))

  cloned.pipe(sink(function (chunk, enc, cb) {
    t.equal(chunk.toString(), 'hello world', 'chunk matches')
    cb()
  }))
})

test('clone async', function (t) {
  t.plan(4)

  var read = false
  var source = from(function (size, next) {
    if (read) {
      this.push(null)
    } else {
      read = true
      this.push('hello world')
    }
    next()
  })

  var instance = cloneable(source)
  t.notOk(read, 'stream not started')

  var cloned = instance.clone()
  t.notOk(read, 'stream not started')

  instance.pipe(sink(function (chunk, enc, cb) {
    t.equal(chunk.toString(), 'hello world', 'chunk matches')
    cb()
  }))

  setImmediate(function () {
    cloned.pipe(sink(function (chunk, enc, cb) {
      t.equal(chunk.toString(), 'hello world', 'chunk matches')
      cb()
    }))
  })
})

test('basic passthrough in obj mode', function (t) {
  t.plan(2)

  var read = false
  var source = from.obj(function (size, next) {
    if (read) {
      this.push(null)
    } else {
      read = true
      this.push({ hello: 'world' })
    }
    next()
  })

  var instance = cloneable(source)
  t.notOk(read, 'stream not started')

  instance.pipe(sink.obj(function (chunk, enc, cb) {
    t.deepEqual(chunk, { hello: 'world' }, 'chunk matches')
    cb()
  }))
})

test('multiple clone in object mode', function (t) {
  t.plan(4)

  var read = false
  var source = from.obj(function (size, next) {
    if (read) {
      this.push(null)
    } else {
      read = true
      this.push({ hello: 'world' })
    }
    next()
  })

  var instance = cloneable(source)
  t.notOk(read, 'stream not started')

  var cloned = instance.clone()
  t.notOk(read, 'stream not started')

  instance.pipe(sink.obj(function (chunk, enc, cb) {
    t.deepEqual(chunk, { hello: 'world' }, 'chunk matches')
    cb()
  }))

  setImmediate(function () {
    cloned.pipe(sink.obj(function (chunk, enc, cb) {
      t.deepEqual(chunk, { hello: 'world' }, 'chunk matches')
      cb()
    }))
  })
})

test('basic passthrough with data event', function (t) {
  t.plan(2)

  var read = false
  var source = from(function (size, next) {
    if (read) {
      this.push(null)
    } else {
      read = true
      this.push('hello world')
    }
    next()
  })

  var instance = cloneable(source)
  t.notOk(read, 'stream not started')

  var data = ''
  instance.on('data', function (chunk) {
    data += chunk.toString()
  })

  instance.on('end', function () {
    t.equal(data, 'hello world', 'chunk matches')
  })
})

test('basic passthrough with data event on clone', function (t) {
  t.plan(3)

  var read = false
  var source = from(function (size, next) {
    if (read) {
      this.push(null)
    } else {
      read = true
      this.push('hello world')
    }
    next()
  })

  var instance = cloneable(source)
  var cloned = instance.clone()

  t.notOk(read, 'stream not started')

  var data = ''
  cloned.on('data', function (chunk) {
    data += chunk.toString()
  })

  cloned.on('end', function () {
    t.equal(data, 'hello world', 'chunk matches in clone')
  })

  instance.pipe(sink(function (chunk, enc, cb) {
    t.equal(chunk.toString(), 'hello world', 'chunk matches in instance')
    cb()
  }))
})

test('errors if cloned after start', function (t) {
  t.plan(2)

  var source = from(function (size, next) {
    this.push('hello world')
    this.push(null)
    next()
  })

  var instance = cloneable(source)

  instance.pipe(sink(function (chunk, enc, cb) {
    t.equal(chunk.toString(), 'hello world', 'chunk matches')
    t.throws(function () {
      instance.clone()
    }, 'throws if cloned after start')
    cb()
  }))
})

