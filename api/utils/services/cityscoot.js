import nfetch from 'node-fetch'
import eventbus from '../../eventbus.js'
import r from '../../db.js'
import { generateSnowflake } from '../snowflake.js'
import fs from 'fs'

const zones = JSON.parse(fs.readFileSync('./api/utils/services/cityscootZones.json'))

let unitsCache = []
let tripsCache = [];

(async() => {
  const cachedTrips = await r.collection('trips').find({ service: 'cityscoot' }).toArray()
  cachedTrips.forEach(t => {
    tripsCache[t.zone].push(t)
  })
})()

zones.forEach(zone => {
  unitsCache[zone.slug] = []
  tripsCache[zone.slug] = []
})

function getUnits(zone) {
  return new Promise(resolve => {
    nfetch("https://www.cityscoot.eu/wp-content/themes/cityscoot/assets/js/scooters_city.php", {
      "headers": {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
      },
      "body": "access_token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE2NzczMjMwMzMsInVzZXJuYW1lIjoiYWRtaW5AY2l0eXNjb290LmV1IiwiYXBwX2lkIjoxfQ.Po3IOBXR-1wuMMqKFa8kKnZ26XG_soZ3fQDYv9o_neo&city_id=" + zone.id,
      "method": "POST",
      "mode": "cors"
    }).then(r => r.json()).then(res => {
      const units = res.map(u => {
        return {
          serviceID: parseInt(u.id),
          zone: zone.slug,
          type: 'moped',
          service: 'cityscoot',
          brand: 'cityscoot',
          code: parseInt(u.name.slice(6)),
          licensePlate: u.plate,
          location: {
            coords: [u.longitude, u.latitude]
          },
          batteryLevel: u.battery
        }
      })
      resolve({
        units: units,
        nextUpdateDate: new Date(res[0].dateUpdate).getTime() + 70 * 1000
      })
    })
  })
}

async function watchUnits() {
  for(const zone of zones) {
    const data = await getUnits(zone)
    const units = data.units

    if(units.length < 10) continue

    if(unitsCache[zone.slug].length) {
      unitsCache[zone.slug].forEach(cu => {
        if(!units.find(u => u.serviceID === cu.serviceID)) {
          const trip = {
            _id: generateSnowflake('trip'),
            zone: zone.slug,
            unitID: cu.serviceID,
            unitType: cu.type,
            service: 'cityscoot',
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
          trip.route = [trip.start.location, trip.end.location]
          eventbus.emit('trip', trip)
          console.log(`CITYSCOOT TRIP END IN ${zone.slug}. (${trip.start.location} --> ${trip.end.location}) - ${Math.floor((trip.end.date - trip.start.date) / 1000 / 60 * 100) / 100} min`)
          r.collection('trips').updateOne({ _id: trip._id }, { $set: trip })
        }
      })
    }

    unitsCache[zone.slug] = units

    eventbus.emit('units', {
      service: 'cityscoot',
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