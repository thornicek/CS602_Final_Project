const {MongoClient} = require('mongodb');
const credentials = require("./credentials.js");

async function main() {
     const dbUrl = 'mongodb://' + credentials.username + ':' + credentials.password + '@' + credentials.host + ':' + credentials.port + '/' + credentials.database;

    const mongoclient = await new MongoClient(dbUrl);
    let connectionPromise = await mongoclient.connect();

    return connectionPromise;
}

let connectionPromise = main();

module.exports = {
    connectionPromise: connectionPromise
}
