'use strict'

var through2 = require('through2')
var inherits = require('inherits')
var pump = require('pump')
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
}

inherits(Cloneable, Ctor)

function onData (event, listener) {
  if (event === 'data' || event === 'readable') {
    this.removeListener('newListener', onData)
    process.nextTick(this._clonePiped.bind(this))
  }
}

Cloneable.prototype.clone = function () {
  if (!this._original) {
    throw new Error('already started')
  }

  this._clonesCount++
  return pump(this, new Clone(this))
}

Cloneable.prototype._clonePiped = function () {
  if (--this._clonesCount === 0) {
    pump(this._original, this)
    this._original = undefined
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
}

function onDataClone (event, listener) {
  if (event === 'data' || event === 'readable') {
    process.nextTick(this.parent._clonePiped.bind(this.parent))
    this.removeListener('newListener', onDataClone)
  }
}

inherits(Clone, Ctor)

module.exports = Cloneable
