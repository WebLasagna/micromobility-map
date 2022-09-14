import { createServer } from 'http'
import express from 'express'
import cors from 'cors'
import { Server as IOServer } from 'socket.io'

import { watchUnits as watchTierUnits, tripsCache as tierTripsCache, unitsCache as tierUnitsCache } from './utils/services/tier.js'
import { watchUnits as watchCityscootUnits, tripsCache as cityscootTripsCache, unitsCache as cityscootUnitsCache } from './utils/services/cityscoot.js'
import { unitsCache as yegoUnitsCache, watchUnits as watchYegoUnits } from './utils/services/yego.js'
import eventbus from './eventbus.js'

const app = express()
const io = new IOServer()
const server = createServer(app)

io.attach(server, {
  cors: {
    origin: '*'
  }
})

app.use(cors())

app.get('/ping', (req, res) => {
  res.send('Pong!')
})

watchTierUnits()
watchCityscootUnits()
watchYegoUnits()

eventbus.on('units', ({ service, units }) => {
  if(service === 'tier') {
    units = Object.values(units).flat()
    io.to('tier').emit('tierUnits', units)
  }
  else if(service === 'cityscoot') {
    units = Object.values(units).flat()
    io.to('cityscoot').emit('cityscootUnits', units)
  }
  else if(service === 'yego') {
    io.to('yego').emit('yegoUnits', units)
  }
})

eventbus.on('trip', trip => {
  if(trip.service === 'tier') {
    const flatCache = Object.values(tierTripsCache).flat()
    io.to('tier').emit('tierTrips', flatCache.filter(t => t.end/* .date  > (Date.now() - 60 * 60 * 1000) */))
  }
  else if(trip.service === 'cityscoot') {
    const flatCache = Object.values(cityscootUnitsCache).flat()
    io.to('cityscoot').emit('cityscootTrips', flatCache.filter(t => t.end/* .date  > (Date.now() - 60 * 60 * 1000) */))
  }
})

io.on('connection', socket => {
  console.log(socket.id, 'connected')

  socket.on('subscribe', channel => {
    if(!['tier', 'cityscoot', 'yego'].includes(channel)) return
    socket.join(channel)
    console.log(socket.id, 'subscribed to', channel)

    if(channel === 'tier') {
      const flatUnitsCache = Object.values(tierUnitsCache).flat()
      const flatTripsCache = Object.values(tierTripsCache).flat()
      socket.emit('tierUnits', flatUnitsCache)
      socket.emit('tierTrips', flatTripsCache.filter(t => t.end.date/*  > (Date.now() - 60 * 60 * 1000) */))
    }
    else if(channel === 'cityscoot') {
      const flatUnitsCache = Object.values(cityscootUnitsCache).flat()
      const flatTripsCache = Object.values(cityscootTripsCache).flat()
      socket.emit('cityscootUnits', flatUnitsCache)
      socket.emit('cityscootTrips', flatTripsCache.filter(t => t.end.date/*  > (Date.now() - 60 * 60 * 1000) */))
    }
    else if(channel === 'yego') {
      socket.emit('yegoUnits', yegoUnitsCache)
    }
  })

  socket.on('disconnect', () => {
    console.log(socket.id, 'disconnected')
  })
})

server.listen(2755, () => {
  console.log('Listening on http://localhost:2755')
})