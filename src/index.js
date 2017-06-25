'use strict'

//import 'babel-polyfill'

import Emitter from 'eventemitter3'

import createDebug from 'debug'
import createFilter from './filter'
import createStream from './stream'

const debug = createDebug('mongo-oplog')

// Add callback support to promise
const toCb = fn => cb => {
  try {
    const val = fn(cb)
    if (!cb) return val
    else if (val && typeof val.then === 'function') {
      return val.then(val => cb(null, val)).catch(cb)
    }
    cb(null, val)
  } catch (err) {
    cb(err)
  }
}

export default (options = {}) => {
  let stream
  let { db, ns, ts, coll} = options

  const oplog = new Emitter()

  async function tail() {
    try {
      debug('Connected to oplog database')
      stream = await createStream({ ns, coll, ts, db })
      stream.on('end', onend)
      stream.on('data', (doc)=>{ondata(doc);})
      stream.on('error', onerror)
      return stream
    } catch (err) {
      onerror(err)
    }
  }

  function filter(ns) {
    return createFilter(ns, oplog)
  }

  async function stop() {
    if (stream) stream.destroy()
    debug('streaming stopped')
    return oplog
  }

  async function destroy() {
    await stop()
    return oplog
  }

  function ondata(doc) {
    if (oplog.ignore) return oplog
    debug('incoming data %j', doc)
    ts = doc.ts

    oplog.emit('op', doc)
    // const events = {
    //   i: 'insert',
    //   u: 'update',
    //   d: 'delete'
    // }
    //oplog.emit(events[doc.op], doc)
    return oplog
  }

  function onend() {
    debug('stream ended')
    oplog.emit('end')
    return oplog
  }

  function onerror(err) {
    if (/cursor (killed or )?timed out/.test(err.message)) {
      debug('cursor timeout - re-tailing %j', err)
      tail()
    } else {
      debug('oplog error %j', err)
      oplog.emit('error', err)
      throw err
    }
  }

  return Object.assign(oplog, {
    db,
    filter,
    tail: toCb(tail),
    stop: toCb(stop),
    destroy: toCb(destroy)
  })
}
