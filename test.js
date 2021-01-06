'use strict'

const fs = require('fs')
const path = require('path')
const { test } = require('tape')
const from = require('from2')
const crypto = require('crypto')
const sink = require('flush-write-stream')
const cloneable = require('./')
const pipeline = require('readable-stream').pipeline
const Readable = require('readable-stream').Readable

test('basic passthrough', function (t) {
  t.plan(2)

  let read = false
  const source = from(function (size, next) {
    if (read) {
      this.push(null)
    } else {
      read = true
      this.push('hello world')
    }
    next()
  })

  const instance = cloneable(source)
  t.notOk(read, 'stream not started')

  instance.pipe(sink(function (chunk, enc, cb) {
    t.equal(chunk.toString(), 'hello world', 'chunk matches')
    cb()
  }))
})

test('clone sync', function (t) {
  t.plan(4)

  let read = false
  const source = from(function (size, next) {
    if (read) {
      this.push(null)
    } else {
      read = true
      this.push('hello world')
    }
    next()
  })

  const instance = cloneable(source)
  t.notOk(read, 'stream not started')

  const cloned = instance.clone()
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

test('clone sync delayed', function (t) {
  t.plan(4)

  let read = false
  const source = from(function (size, next) {
    if (read) {
      this.push(null)
    } else {
      read = true
      this.push('hello world')
    }
    next()
  })

  const instance = cloneable(source)
  t.notOk(read, 'stream not started')

  const cloned = instance.clone()
  t.notOk(read, 'stream not started')

  setTimeout(() => {
    cloned.pipe(sink(function (chunk, enc, cb) {
      t.equal(chunk.toString(), 'hello world', 'chunk matches')
      cb()
    }))

    setTimeout(() => {
      instance.pipe(sink(function (chunk, enc, cb) {
        t.equal(chunk.toString(), 'hello world', 'chunk matches')
        cb()
      }))
    }, 10)
  }, 10)
})

test('clone async', function (t) {
  t.plan(4)

  let read = false
  const source = from(function (size, next) {
    if (read) {
      this.push(null)
    } else {
      read = true
      this.push('hello world')
    }
    next()
  })

  const instance = cloneable(source)
  t.notOk(read, 'stream not started')

  const cloned = instance.clone()
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

  let read = false
  const source = from.obj(function (size, next) {
    if (read) {
      return this.push(null)
    } else {
      read = true
      this.push({ hello: 'world' })
    }
    next()
  })

  const instance = cloneable(source)
  t.notOk(read, 'stream not started')

  instance.pipe(sink.obj(function (chunk, enc, cb) {
    t.deepEqual(chunk, { hello: 'world' }, 'chunk matches')
    cb()
  }))
})

test('multiple clone in object mode', function (t) {
  t.plan(4)

  let read = false
  const source = from.obj(function (size, next) {
    if (read) {
      return this.push(null)
    } else {
      read = true
      this.push({ hello: 'world' })
    }
    next()
  })

  const instance = cloneable(source)
  t.notOk(read, 'stream not started')

  const cloned = instance.clone()
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

  let read = false
  const source = from(function (size, next) {
    if (read) {
      this.push(null)
    } else {
      read = true
      this.push('hello world')
    }
    next()
  })

  const instance = cloneable(source)
  t.notOk(read, 'stream not started')

  let data = ''
  instance.on('data', function (chunk) {
    data += chunk.toString()
  })

  instance.on('end', function () {
    t.equal(data, 'hello world', 'chunk matches')
  })
})

test('basic passthrough with data event on clone', function (t) {
  t.plan(3)

  let read = false
  const source = from(function (size, next) {
    if (read) {
      this.push(null)
    } else {
      read = true
      this.push('hello world')
    }
    next()
  })

  const instance = cloneable(source)
  const cloned = instance.clone()

  t.notOk(read, 'stream not started')

  let data = ''
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

  const source = from(function (size, next) {
    this.push('hello world')
    this.push(null)
    next()
  })

  const instance = cloneable(source)

  instance.pipe(sink(function (chunk, enc, cb) {
    t.equal(chunk.toString(), 'hello world', 'chunk matches')
    t.throws(function () {
      instance.clone()
    }, 'throws if cloned after start')
    cb()
  }))
})

test('basic passthrough with readable event', function (t) {
  t.plan(2)

  let read = false
  const source = from(function (size, next) {
    if (read) {
      this.push(null)
    } else {
      read = true
      this.push('hello world')
    }
    next()
  })

  const instance = cloneable(source)
  t.notOk(read, 'stream not started')

  let data = ''
  instance.on('readable', function () {
    let chunk
    while ((chunk = this.read()) !== null) {
      data += chunk.toString()
    }
  })

  instance.on('end', function () {
    t.equal(data, 'hello world', 'chunk matches')
  })
})

test('basic passthrough with readable event on clone', function (t) {
  t.plan(3)

  let read = false
  const source = from(function (size, next) {
    if (read) {
      this.push(null)
    } else {
      read = true
      this.push('hello world')
    }
    next()
  })

  const instance = cloneable(source)
  const cloned = instance.clone()

  t.notOk(read, 'stream not started')

  let data = ''
  cloned.on('readable', function () {
    let chunk
    while ((chunk = this.read()) !== null) {
      data += chunk.toString()
    }
  })

  cloned.on('end', function () {
    t.equal(data, 'hello world', 'chunk matches in clone')
  })

  instance.pipe(sink(function (chunk, enc, cb) {
    t.equal(chunk.toString(), 'hello world', 'chunk matches in instance')
    cb()
  }))
})

test('source error destroys all', function (t) {
  t.plan(3)

  const source = from()
  const instance = cloneable(source)
  const clone = instance.clone()

  source.on('error', function (err) {
    t.ok(err, 'source errors')

    instance.on('error', function (err2) {
      t.ok(err === err2, 'instance receives same error')
    })

    clone.on('error', function (err3) {
      t.ok(err === err3, 'clone receives same error')
    })
  })

  source.emit('error', new Error())
})

test('source destroy destroys all', function (t) {
  t.plan(2)

  const source = from()
  const instance = cloneable(source)
  const clone = instance.clone()

  instance.on('end', function () {
    t.pass('instance has ended')
  })

  clone.on('end', function () {
    t.pass('clone has ended')
  })

  clone.resume()
  instance.resume()

  source.destroy()
})

test('instance error destroys all but the source', function (t) {
  t.plan(4)

  const source = from()
  const instance = cloneable(source)
  const clone = instance.clone()

  source.on('close', function () {
    t.fail('source should not be closed')
  })

  instance.on('error', function (err) {
    t.is(err.message, 'beep', 'instance errors')
  })

  instance.on('close', function () {
    t.pass('close should be emitted')
  })

  clone.on('error', function (err) {
    t.is(err.message, 'beep', 'instance errors')
  })

  clone.on('close', function () {
    t.pass('close should be emitted')
  })

  instance.destroy(new Error('beep'))
})

test('instance destroy destroys all but the source', function (t) {
  t.plan(2)

  const source = from()
  const instance = cloneable(source)
  const clone = instance.clone()

  source.on('close', function () {
    t.fail('source should not be closed')
  })

  instance.on('end', function () {
    t.pass('instance has ended')
  })

  clone.on('end', function () {
    t.pass('clone has ended')
  })

  instance.resume()
  clone.resume()

  instance.destroy()
})

test('clone destroy does not affect other clones, cloneable or source', function (t) {
  t.plan(1)

  const source = from()
  const instance = cloneable(source)
  const clone = instance.clone()
  const other = instance.clone()

  source.on('close', function () {
    t.fail('source should not be closed')
  })

  instance.on('close', function () {
    t.fail('instance should not be closed')
  })

  other.on('close', function () {
    t.fail('other clone should not be closed')
  })

  clone.on('close', function () {
    t.pass('clone is closed')
  })

  clone.destroy()
})

test('clone remains readable if other is destroyed', function (t) {
  t.plan(3)

  let read = false
  const source = from(function (size, next) {
    if (read) {
      this.push(null)
    } else {
      read = true
      this.push('hello')
    }
    next()
  })

  const instance = cloneable(source)
  const clone = instance.clone()
  const other = instance.clone()

  instance.pipe(sink.obj(function (chunk, enc, cb) {
    t.deepEqual(chunk.toString(), 'hello', 'instance chunk matches')
    cb()
  }))

  clone.pipe(sink.obj(function (chunk, enc, cb) {
    t.deepEqual(chunk.toString(), 'hello', 'clone chunk matches')
    cb()
  }))

  clone.on('close', function () {
    t.fail('clone should not be closed')
  })

  instance.on('close', function () {
    t.fail('instance should not be closed')
  })

  other.on('close', function () {
    t.pass('other is closed')
  })

  other.destroy()
})

test('clone of clone', function (t) {
  t.plan(6)

  let read = false
  const source = from(function (size, next) {
    if (read) {
      this.push(null)
    } else {
      read = true
      this.push('hello world')
    }
    next()
  })

  const instance = cloneable(source)
  t.notOk(read, 'stream not started')

  const cloned = instance.clone()
  t.notOk(read, 'stream not started')

  const replica = cloned.clone()
  t.notOk(read, 'stream not started')

  instance.pipe(sink(function (chunk, enc, cb) {
    t.equal(chunk.toString(), 'hello world', 'chunk matches')
    cb()
  }))

  cloned.pipe(sink(function (chunk, enc, cb) {
    t.equal(chunk.toString(), 'hello world', 'chunk matches')
    cb()
  }))

  replica.pipe(sink(function (chunk, enc, cb) {
    t.equal(chunk.toString(), 'hello world', 'chunk matches')
    cb()
  }))
})

test('from vinyl', function (t) {
  t.plan(3)

  const source = from(['wa', 'dup'])

  const instance = cloneable(source)
  const clone = instance.clone()

  let data = ''
  let data2 = ''
  let ends = 2

  function latch () {
    if (--ends === 0) {
      t.equal(data, data2)
    }
  }

  instance.on('data', function (chunk) {
    data += chunk.toString()
  })

  process.nextTick(function () {
    t.equal('', data, 'nothing was written yet')
    t.equal('', data2, 'nothing was written yet')

    clone.on('data', function (chunk) {
      data2 += chunk.toString()
    })
  })

  instance.on('end', latch)
  clone.on('end', latch)
})

test('waits till all are flowing', function (t) {
  t.plan(1)

  const source = from(['wa', 'dup'])

  const instance = cloneable(source)

  // we create a clone
  instance.clone()

  instance.on('data', function (chunk) {
    t.fail('this should never happen')
  })

  process.nextTick(function () {
    t.pass('wait till nextTick')
  })
})

test('isCloneable', function (t) {
  t.plan(4)

  const source = from(['hello', ' ', 'world'])
  t.notOk(cloneable.isCloneable(source), 'a generic readable is not cloneable')

  const instance = cloneable(source)
  t.ok(cloneable.isCloneable(instance), 'a cloneable is cloneable')

  const clone = instance.clone()
  t.ok(cloneable.isCloneable(clone), 'a clone is cloneable')

  const cloneClone = clone.clone()
  t.ok(cloneable.isCloneable(cloneClone), 'a clone of a clone is cloneable')
})

test('emits finish', function (t) {
  const chunks = ['a', 'b', 'c', 'd', null]
  const e1 = ['a', 'b', 'c', 'd']
  const e2 = ['a', 'b', 'c', 'd']

  t.plan(2 + e1.length + e2.length)

  const source = from(function (size, next) {
    setImmediate(next, null, chunks.shift())
  })

  const instance = cloneable(source)

  const clone = instance.clone()

  clone.on('finish', t.pass.bind(null, 'clone emits finish'))
  instance.on('finish', t.pass.bind(null, 'main emits finish'))

  instance.pipe(sink(function (chunk, enc, cb) {
    t.equal(chunk.toString(), e1.shift(), 'chunk matches')
    cb()
  }))

  clone.on('data', function (chunk) {
    t.equal(chunk.toString(), e2.shift(), 'chunk matches')
  })
})

test('clone async w resume', function (t) {
  t.plan(4)

  let read = false
  const source = from(function (size, next) {
    if (read) {
      this.push(null)
    } else {
      read = true
      this.push('hello world')
    }
    next()
  })

  const instance = cloneable(source)
  t.notOk(read, 'stream not started')

  const cloned = instance.clone()
  t.notOk(read, 'stream not started')

  instance.on('end', t.pass.bind(null, 'end emitted'))
  instance.resume()

  setImmediate(function () {
    cloned.on('end', t.pass.bind(null, 'end emitted'))
    cloned.resume()
  })
})

test('big file', function (t) {
  t.plan(13)

  const stream = cloneable(fs.createReadStream(path.join(__dirname, 'big')))
  const hash = crypto.createHash('sha1')
  hash.setEncoding('hex')

  let toCheck

  fs.createReadStream(path.join(__dirname, 'big'))
    .pipe(hash)
    .once('readable', function () {
      toCheck = hash.read()
      t.ok(toCheck)
    })

  function pipe (s, num) {
    s.on('end', function () {
      t.pass('end for ' + num)
    })

    const dest = path.join(__dirname, 'out')

    s.pipe(fs.createWriteStream(dest))
      .on('finish', function () {
        t.pass('finish for ' + num)

        const destHash = crypto.createHash('sha1')
        destHash.setEncoding('hex')

        fs.createReadStream(dest)
          .pipe(destHash)
          .once('readable', function () {
            const hash = destHash.read()
            t.ok(hash)
            t.equal(hash, toCheck)
          })
      })
  }

  // Pipe in another event loop tick <-- this one finished only, it's the original cloneable.
  setImmediate(pipe.bind(null, stream, 1))

  // Pipe in the same event loop tick
  pipe(stream.clone(), 0)

  // Pipe a long time after
  setTimeout(pipe.bind(null, stream.clone(), 2), 1000)
})

test('pipeline error', function (t) {
  t.plan(1)

  const err = new Error('kaboom')

  pipeline([
    cloneable(new Readable({
      read: function () {
        this.destroy(err)
      }
    })),
    sink(function (chunk, enc, cb) {
      t.fail('this should not be called')
    })
  ], function (_err) {
    t.equal(_err, err)
  })
})
