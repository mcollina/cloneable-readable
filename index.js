'use strict'
const { PassThrough } = require("stream")
class Cloneable extends PassThrough {
  constructor(stream, opts) {
    super({...opts, objectMode: stream._readableState.objectMode})
    this._original = stream
    this._clonesCount = 1
    this._internalPipe = false
    forwardDestroy(stream, this)
    this.on('newListener', this.onData)
    this.on("resume", this.onResume)
    this._hasListener = true
  }
  _destroy (err, cb) {
    if (!err) {
      this.push(null)
      this.end()
    }
    process.nextTick(cb, err)
  }
  resume() {
    if (this._internalPipe) return
    super.resume()
  }
  clone() {
    if (!this._original) {
      throw new Error('already started')
    }
    this._clonesCount++
    // the events added by the clone should not count
    // for starting the flow
    this.removeListener('newListener', this.onData)
    this.removeListener('resume', this.onResume)
    const clone = new Clone(this)
    if (this._hasListener) {
        this.on('newListener', this.onData)
        this.on('resume', this.onResume)
    }
    return clone
  }
  onData (event) {
      if (event === 'data' || event === 'readable') {
          this._hasListener = false
          this.removeListener('newListener', this.onData)
          this.removeListener('resume', this.onResume)
        process.nextTick(clonePiped, this)
      }
  }
  onResume () {
      this._hasListener = false
      this.removeListener('newListener', this.onData)
      this.removeListener('resume', this.onResume)
      process.nextTick(clonePiped, this)
  }    
  static isCloneable (stream) {
      return stream instanceof Cloneable || stream instanceof Clone
  }
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
class Clone extends PassThrough {
  constructor(parent, opts) {
    super({...opts, objectMode: parent._readableState.objectMode})
    this.parent = parent
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
    this.on('newListener', this.onDataClone)
    this.once('resume', this.onResumeClone)
  }
  clone () {
    return this.parent.clone()
  }
  _destroy (err, cb) {
    if (!err) {
      this.push(null)
      this.end()
    }
    process.nextTick(cb, err)
  }   
  onDataClone (event) {
    // We start the flow once all clones are piped or destroyed
    if (event === 'data' || event === 'readable' || event === 'close') {
      process.nextTick(clonePiped, this.parent)
      this.removeListener('newListener', this.onDataClone)
      this.removeListener('resume', this.onResumeClone)
    }
  }
    
  onResumeClone () {
    this.removeListener('newListener', this.onDataClone)
    this.removeListener('resume', this.onResumeClone)
    process.nextTick(clonePiped, this.parent)
  }
}
function cloneable(stream, opts) {
  return new Cloneable(stream, opts)
}
const myModule = module.exports = cloneable
myModule.Cloneable = Cloneable
