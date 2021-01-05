'use strict'

const cloneable = require('./')
const fs = require('fs')
const pump = require('pump')

const stream = cloneable(fs.createReadStream('./package.json'))

pump(stream.clone(), fs.createWriteStream('./out1'))

// simulate some asynchronicity
setImmediate(function () {
  pump(stream, fs.createWriteStream('./out2'))
})
