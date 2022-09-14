import snowflakey from 'snowflakey'

const types = [
  {
    id: 1,
    name: 'trip'
  }
]
let workers = {}

types.forEach(type => {
  const worker = new snowflakey.Worker({
    epoch: 1577836800000,
    workerId: type.id,
    processId: process.pid,
    workerBits: 8,
    processBits: 0,
    incrementBits: 14
  })

  workers[type.name] = worker
})

function generateSnowflake(type) {
  return workers[type].generate()
}

function toDate(snowflake) {
  return snowflakey.lookup(snowflake, 1577836800000)
}

export {
  generateSnowflake,
  toDate
}