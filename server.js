const express = require('express');
const app = express();

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// setup handlebars view engine
const { engine } = require('express-handlebars');

const db_manager = require('./db.js');

const { ObjectId } = require('mongodb');
const { application } = require('express');

let connectionPromise = db_manager.connectionPromise;

app.engine('handlebars', 
	engine({defaultLayout: 'main_paige'}));

app.set('view engine', 'handlebars');

// static resources
app.use(express.static(__dirname + '/public'));

// get articles from db
app.get('/', (req, res) => {
    connectionPromise
        .then(client => {
        return client.db("blog_db").collection('article').find({});
        })
        .then(cursor => {
            return cursor.toArray();
        })
        .then(results => {
            for (const element of results) {
                const previewText = element.content.split(' ').slice(0,20).join(' ');
                element.content = previewText;
                const stringID = element._id.toString();
                element._id = stringID;
            }
            res.render("display_blog", {data:results});
        })
    })

// Post comment into db 
app.post('/post-feedback/:id', function(req, res){
    let paramData = req.params;
    let stringID = paramData.id;
    connectionPromise
    .then(client => {
        console.log("req.body is:");
        console.log(req.body);
        return client.db("blog_db").collection('article').updateOne(
            {"_id":new ObjectId(stringID)},
            {$addToSet:{comments: req.body}});
    })
    .then(result => {
        result._id = result._id.toString();
        res.render("display_single_blog", {data: result})
    })
    
});


// show "read more" single blog entry
app.get('/article/:id', (req,res) => {
    let paramData = req.params;
    let stringID = paramData.id;
    connectionPromise
        .then(client => {
            return client.db("blog_db").collection('article').findOne({"_id": new ObjectId(stringID)});
        })
        .then(result => {
            // console.log("result is:");
            // console.log(result);
            res.render("display_single_blog", {data: result});
        })
})

// endpoint to show all articles in XML and json
app.get('/api/article', (req,res) =>{
    connectionPromise
    .then(client =>{
        return client.db('blog_db').collection('article').find({});
    })
    .then(cursor => {
        return cursor.toArray();
    })
    .then(result => {
        res.format({
            'application/json':function(){
                res.json(result)
            },
        'application/xml':function(){
            // console.log("Entered function for XML");
            let blogXml = `<?xml version="1.0"?>\n <article>`
            // console.log("before for loop"); 
            for(const entry of result){
                blogXml += `\n <title>${entry.title}</title> \n <content>${entry.content}</content>`
            }
            // console.log("for loop closed");
            blogXml += `\n </article>`
            // console.log("XML closed");
            // console.log(blogXml);
            res.type('application/xml');
            res.send(blogXml);
        } 
        })
    })
})

// endpoint to show a single article
app.get('/api/article/:id', (req,res) =>{
    let paramData = req.params;
    let stringID = paramData.id;
    connectionPromise
    .then(client=>{
        return client.db('blog_db').collection('article').findOne({"_id": new ObjectId(stringID)});
    })
    .then(result => {
        res.format({
            'application/json': function(){
                res.json(result)
            },
        'application/xml': function(){
            let blogXml = `<?xml version="1.0"?>\n <article>\n<title>${result.title}</title> \n <content>${result.content}</content></article>`
            res.type('application/xml');
            res.send(blogXml);
        }
        })
    })
})



// testing connection to db
app.get('/test_mongo', (req, res) => {
    console.log("test_mongo entered");
    console.log("connectionPromise is:");
    console.log(connectionPromise);
    connectionPromise.then(client => {
        // console.log("promise resoluton");
        // console.log("client is:");
        // console.log(client);
        const cursor = client.db("test_db").collection("test_collection").find({});
        // console.log("cursor is:");
        // console.log(cursor);
        cursor.toArray().then(results => {
            // console.log("results are:");
            // console.log(results);
            const firstResult = results[0];
            // console.log(`firstResult is ${firstResult}`);
            res.json(firstResult);
        })
    })

    
})

app.listen(3000, () => {
    console.log('http://localhost:3000');
  });