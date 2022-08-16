const {MongoClient} = require('mongodb');
const credentials = require("./credentials.js");
const dbUrl = 'mongodb://' + credentials.username + ':' + credentials.password + '@' + credentials.host + ':' + credentials.port + '/' + credentials.database;

async function get_db_promise() {
    let mongoclient = await new MongoClient(dbUrl);
    let connectionPromise = await mongoclient.connect();
    return connectionPromise;
}

function get_db() {
    let mongoclient = new MongoClient(dbUrl);
    let connectionPromise = mongoclient.connect().then(connection => {
        return connection;
    })
}

let connectionPromise = get_db_promise();
let connection = get_db();

module.exports = {
    connectionPromise: connectionPromise,
    connection: connection
}
