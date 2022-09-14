import { MongoClient } from 'mongodb'

const client = new MongoClient('mongodb://main:FA38bc54de@75.119.142.9:27017')

const dbConnection = client.db('mmmap')

await client.connect()

export default dbConnection