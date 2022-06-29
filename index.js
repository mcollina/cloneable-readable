'use strict'

const { PassThrough } = require('readable-stream')
const { nextTick } = require('process')

function Cloneable (stream, opts) {
  if (!(this instanceof Cloneable)) {
    return new Cloneable(stream, opts)
  }

  const objectMode = stream._readableState.objectMode
  this._original = stream
  this._clonesCount = 1
  this._internalPipe = false

  opts = opts || {}
  opts.objectMode = objectMode

  PassThrough.call(this, opts)

  forwardDestroy(stream, this)

  this.on('newListener', onData)
  this.on('resume', onResume)

  this._hasListener = true
}

Object.setPrototypeOf(Cloneable.prototype, PassThrough.prototype)
Object.setPrototypeOf(Cloneable, PassThrough)

function onData (event, listener) {
  if (event === 'data' || event === 'readable') {
    this._hasListener = false
    this.removeListener('newListener', onData)
    this.removeListener('resume', onResume)

    nextTick(clonePiped, this)
  }
}

function onResume () {
  this._hasListener = false
  this.removeListener('newListener', onData)
  this.removeListener('resume', onResume)

  nextTick(clonePiped, this)
}

Cloneable.prototype.resume = function () {
  if (this._internalPipe) return
  PassThrough.prototype.resume.call(this)
}

Cloneable.prototype.clone = function () {
  if (!this._original) {
    throw new Error('already started')
  }

  this._clonesCount++

  // the events added by the clone should not count
  // for starting the flow
  this.removeListener('newListener', onData)
  this.removeListener('resume', onResume)
  const clone = new Clone(this)
  if (this._hasListener) {
    this.on('newListener', onData)
    this.on('resume', onResume)
  }

  return clone
}

Cloneable.prototype._destroy = function (err, cb) {
  if (!err) {
    this.push(null)
    this.end()
  }

  nextTick(cb, err)
}

function forwardDestroy (src, dest) {
  src.on('error', destroy)
  src.on('close', onClose)

  function destroy (err) {
    src.removeListener('close', onClose)
    dest.destroy(err)
  }

  function onClose () {
    dest.end()
  }
}

function clonePiped (that) {
  if (--that._clonesCount === 0 && !that._readableState.destroyed) {
    that._original.pipe(that)
    that._original = undefined
  }
}

function Clone (parent, opts) {
  if (!(this instanceof Clone)) {
    return new Clone(parent, opts)
  }

  const objectMode = parent._readableState.objectMode

  opts = opts || {}
  opts.objectMode = objectMode

  this.parent = parent

  PassThrough.call(this, opts)

  forwardDestroy(parent, this)

  // setting _internalPipe flag to prevent this pipe from starting
  // the flow. we have also overridden resume to do nothing when
  // this pipe tries to start the flow
  parent._internalPipe = true
  parent.pipe(this)
  parent._internalPipe = false

  // the events added by the clone should not count
  // for starting the flow
  // so we add the newListener handle after we are done
  this.on('newListener', onDataClone)
  this.once('resume', onResumeClone)
}

function onDataClone (event, listener) {
  // We start the flow once all clones are piped or destroyed
  if (event === 'data' || event === 'readable' || event === 'close') {
    nextTick(clonePiped, this.parent)
    this.removeListener('newListener', onDataClone)
    this.removeListener('resume', onResumeClone)
  }
}

function onResumeClone () {
  this.removeListener('newListener', onDataClone)
  this.removeListener('resume', onResumeClone)
  nextTick(clonePiped, this.parent)
}

Object.setPrototypeOf(Clone.prototype, PassThrough.prototype)
Object.setPrototypeOf(Clone, PassThrough)

Clone.prototype.clone = function () {
  return this.parent.clone()
}

Cloneable.isCloneable = function (stream) {
  return stream instanceof Cloneable || stream instanceof Clone
}

Clone.prototype._destroy = function (err, cb) {
  if (!err) {
    this.push(null)
    this.end()
  }

  nextTick(cb, err)
}

module.exports = Cloneable
