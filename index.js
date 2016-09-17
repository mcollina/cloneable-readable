'use strict'

var through2 = require('through2')
var inherits = require('inherits')
var nextTick = require('process-nextick-args')
var Ctor = through2.ctor()

function Cloneable (stream, opts) {
  if (!(this instanceof Cloneable)) {
    return new Cloneable(stream, opts)
  }

  var objectMode = stream._readableState.objectMode
  this._original = stream
  this._clonesCount = 1

  opts = opts || {}
  opts.objectMode = objectMode

  Ctor.call(this, opts)

  this.on('newListener', onData)

  forwardDestroy(stream, this)
}

inherits(Cloneable, Ctor)

function onData (event, listener) {
  if (event === 'data' || event === 'readable') {
    this.removeListener('newListener', onData)
    nextTick(clonePiped, this)
  }
}

Cloneable.prototype.clone = function () {
  if (!this._original) {
    throw new Error('already started')
  }

  this._clonesCount++
  return this.pipe(new Clone(this))
}

function forwardDestroy (src, dest) {
  src.on('error', destroy)
  src.on('close', destroy)

  function destroy (err) {
    dest.destroy(err)
  }
}

function clonePiped (that) {
  if (--that._clonesCount === 0 && !that._destroyed) {
    that._original.pipe(that)
    that._original = undefined
  }
}

function Clone (parent, opts) {
  if (!(this instanceof Clone)) {
    return new Clone(parent, opts)
  }

  var objectMode = parent._readableState.objectMode

  opts = opts || {}
  opts.objectMode = objectMode

  this.parent = parent

  Ctor.call(this, opts)

  this.on('newListener', onDataClone)

  forwardDestroy(this.parent, this)
}

function onDataClone (event, listener) {
  // We start the flow once all clones are piped or destroyed
  if (event === 'data' || event === 'readable' || event === 'close') {
    nextTick(clonePiped, this.parent)
    this.removeListener('newListener', onDataClone)
  }
}

inherits(Clone, Ctor)

module.exports = Cloneable
