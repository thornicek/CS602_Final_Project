const express = require('express');
const app = express();

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// setup handlebars view engine
const { engine } = require('express-handlebars');

const db_manager = require('./db.js');

let connectionPromise = db_manager.connectionPromise;

app.engine('handlebars', 
	engine({defaultLayout: 'main'}));

app.set('view engine', 'handlebars');

// static resources
app.use(express.static(__dirname + '/public'));

app.get('/',  (req, res) => {
	res.json({"message": "success"})
});

app.get('/test_mongo', (req, res) => {
    console.log("test_mongo entered");
    console.log("connectionPromise is:");
    console.log(connectionPromise);
    connectionPromise.then(client => {
        console.log("promise resoluton");
        console.log("client is:");
        console.log(client);
        const cursor = client.db("test_db").collection("test_collection").find({});
        console.log("cursor is:");
        console.log(cursor);
        cursor.toArray().then(results => {
            console.log("results are:");
            console.log(results);
            const firstResult = results[0];
            console.log(`firstResult is ${firstResult}`);
            res.json(firstResult);
        })
    })

    
})

app.listen(3000, () => {
    console.log('http://localhost:3000');
  });