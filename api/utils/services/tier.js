import nfetch from 'node-fetch'
import eventbus from '../../eventbus.js'
import r from '../../db.js'
import { generateSnowflake } from '../snowflake.js'
import fs from 'fs'

const zones = JSON.parse(fs.readFileSync('./api/utils/services/tierZones.json')).filter(z => !z.ignore)

let unitsCache = {}
let tripsCache = {};

(async() => {
  const cachedTrips = await r.collection('trips').find({ service: 'tier' }).toArray()
  cachedTrips.forEach(t => {
    tripsCache[t.zone].push(t)
  })
})()

zones.forEach(zone => {
  unitsCache[zone.slug] = []
  tripsCache[zone.slug] = []
})

async function getUnits(zone) {
  return new Promise((resolve, reject) => {
    /* console.log(`Fetching Tier units for ${zone.slug}`) */
    nfetch(`https://platform.tier-services.io/v1/vehicle?lat=${zone.coords[1]}&lng=${zone.coords[0]}&radius=30000`, {
      headers: {
        'X-Api-Key': 'bpEUTJEBTf74oGRWxaIcW7aeZMzDDODe1yBoSxi2'
      }
    }).then(r => {
      return r.json()
    }).then(r => {
      resolve(r.data.map(s => {
        return {
          serviceID: s.id,
          zone: zone.slug,
          type: 'escooter',
          service: 'tier',
          brand: 'tier',
          code: s.attributes.code,
          licensePlate: s.attributes.licencePlate,
          location: {
            coords: [s.attributes.lng, s.attributes.lat],
            lastUpdate: Date.parse(s.attributes.lastLocationUpdate)
          },
          lastTripDate: Date.parse(s.attributes.lastStateChange),
          batteryLevel: s.attributes.batteryLevel,
          speedLimit: s.attributes.maxSpeed,
          helmet: {
            available: s.attributes.hasHelmet,
            box: s.attributes.hasHelmetBox
          }
        }
      }))
    }).catch(err => {
      console.log(err)
      resolve([])
    })
  })
}

async function watchUnits() {
  for(const zone of zones) {
    const units = await getUnits(zone)

    if(units.length < 10) continue

    if(unitsCache[zone.slug].length) {
      unitsCache[zone.slug].forEach(cu => {
        if(!units.find(u => u.serviceID === cu.serviceID)) {
          const trip = {
            _id: generateSnowflake('trip'),
            zone: zone.slug,
            unitID: cu.serviceID,
            unitType: cu.type,
            service: 'tier',
            start: {
              location: cu.location.coords,
              batteryLevel: cu.batteryLevel,
              date: Date.now()
            },
            end: false
          }
          tripsCache[zone.slug].push(trip)
          r.collection('trips').insertOne(trip)
        }
      })
    
      units.forEach(async u => {
        if(!unitsCache[zone.slug].find(cu => cu.serviceID === u.serviceID)) {
          const trip = tripsCache[zone.slug].find(t => t.service === u.service && t.unitID === u.serviceID && !t.end)
          if(!trip) return
          trip.end = {
            location: u.location.coords,
            batteryLevel: u.batteryLevel,
            date: Date.now()
          }
          eventbus.emit('trip', trip)
          console.log(`TIER TRIP END IN ${zone.slug} (${trip.start.location} --> ${trip.end.location}) - ${Math.floor((trip.end.date - trip.start.date) / 1000 / 60 * 100) / 100} min`)
          r.collection('trips').updateOne({ _id: trip._id }, { $set: trip })
        }
      })
    }

    unitsCache[zone.slug] = units

    eventbus.emit('units', {
      service: 'tier',
      units: unitsCache
    })
  }

  setTimeout(() => {
    watchUnits()
  }, 7000)
}

export {
  watchUnits,
  unitsCache,
  tripsCache
}