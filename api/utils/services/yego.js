import nfetch from 'node-fetch'
import eventbus from '../../eventbus.js'

let unitsCache = []

function getUnits() {
  return new Promise(resolve => {
    nfetch("https://www.rideyego.com/data/markers-city-4.json").then(r => r.json()).then(res => {
      resolve(res.map(u => {
        return {
          serviceID: parseInt(u.id),
          type: 'moped',
          service: 'yego',
          brand: 'yego',
          name: u.name,
          location: {
            coords: [u.lng, u.lat]
          },
          batteryLevel: u.battery
        }
      }))
    })
  })
}

async function watchUnits() {
  const units = await getUnits()
  eventbus.emit('units', {
    service: 'yego',
    units
  })

  unitsCache = units

  setTimeout(() => {
    watchUnits()
  }, 7000)
}

export {
  watchUnits,
  unitsCache
}