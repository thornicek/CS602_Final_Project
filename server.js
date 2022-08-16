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
const { username } = require('./credentials.js');

const bcrypt = require('bcryptjs');

const jwt = require('jsonwebtoken');
const credentials = require('./credentials.js');
const auth = require("./auth.js")
const cookieParser = require("cookie-parser");

const url_module = require("url");

app.use(cookieParser());

let connectionPromise = db_manager.connectionPromise;

app.engine('handlebars', 
	engine({defaultLayout: 'main_paige'}));

app.set('view engine', 'handlebars');

// static resources
app.use(express.static(__dirname + '/public'));

// get articles from db
app.get('/', (req, res) => {
    console.log("index function entered");
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
        .catch(error => {
            console.log("Got an error while fetching articles: ", error);
        })

    })

// Post comment into db 
app.post('/post-feedback/:id', function(req, res){
    let paramData = req.params;
    let stringID = paramData.id;
    connectionPromise
    .then(client => {
        // console.log("req.body is:");
        // console.log(req.body);
        return client.db("blog_db").collection('article').updateOne(
            {"_id":new ObjectId(stringID)},
            {$addToSet:{comments: req.body}});
    })
    .then(result => {
        res.redirect(`/article/${stringID}`)
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
            result.id = stringID;
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

// admin view 
app.get('/admin', (req, res) => { 
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
            res.render("display_admin_main", {data:results});
        })
        .catch(error => {
            console.log("Got an error while fetching articles: ", error);
        })
    })
// admin single page view
app.get('/admin/edit/:id', (req, res) => {
    let paramData = req.params;
    let stringID = paramData.id;
    connectionPromise
    .then(client => {
        return client.db('blog_db').collection('article').findOne({"_id": new ObjectId(stringID)});
    })
    .then(results => {
        res.render('display_admin_single', {data:results});
    })
})
// admin update article
app.patch('/admin/update/:id', async (req,res) => {
    // console.log("/admin/update/:id PATCH entered");
    let paramData = await req.params;
    let stringID = paramData.id;
    // console.log(`stringID is ${stringID}`);
    let updateTitle = await req.body.title;
    let updateContent = await req.body.content;
    // console.log(`stringID ${stringID} updateTitle ${updateTitle}, updateContent ${updateContent}`);
    if (!(stringID && updateTitle && updateContent)) {
        res.status(400).send("id, new title and new content must be present!");
    }
    connectionPromise
    .then(client => {
        return client.db('blog_db').collection('article').updateOne(
            {"_id": new ObjectId(stringID)},
            {$set:{title: updateTitle, content: updateContent} 
            });
    })
    .then(result => {
        console.log("then with result entered, result is: ", result);
        res.status(204).send();
    })
    .catch(error => {
        console.log("there was an error in PATCH handler: ", error);
    })
})
// admin delete 
app.delete('/admin/delete/:id', async(req, res)=> {
    let paramData = await req.params;
    let stringID = paramData.id;
    console.log("delete endpoint hit")
    connectionPromise
    .then(client => {
        return client.db('blog_db').collection('article').deleteOne(
            {"_id": new ObjectId(stringID)}
        );
    })
    .then(result =>{
        console.log("then with result entered, result is: ", result);
        res.status(204).send();
    })
    .catch(error => {
        console.log("there was an error in DELETe handler: ", error);
    })
})
// admin render add new article
app.get('/admin/add_new', (req,res) => {
   res.render('display_admin_add');

})


// admin add new article 
app.post('/admin/add_new', (req,res) => {
    newTitle = req.body.title;
    newContent = req.body.content;
    connectionPromise
    .then(client => {
        return client.db('blog_db').collection('article').insertOne(
            {title: newTitle, content: newContent
            });
    })
    .then(result => {
        res.redirect('/')
    })
})

// user render new article handlebar
app.get('/user/add_new', (req,res) => {
    res.render('display_user_add');
})

// user add new article
app.post('/user/add_new', (req,res) =>{
    user = req.body.username;
    newTitle = req.body.title;
    newContent = req.body.content;
    connectionPromise
    .then(client => {
        return client.db('blog_db').collection('article').insertOne({
            username: username, title: newTitle, content: newContent
        });
    })
    .then(result => {
        res.redirect('/')
    })
})


// testing connection to db
app.get('/test_mongo', (req, res) => {
    // console.log("test_mongo entered");
    // console.log("connectionPromise is:");
    // console.log(connectionPromise);
    connectionPromise.then(client => {
        const cursor = client.db("test_db").collection("test_collection").find({});
        cursor.toArray().then(results => {
            const firstResult = results[0];
            res.json(firstResult);
        })
    })

    
})

app.post("/registration_form_handler", async (req, res) => {
    console.log("POST /registration_form_handler");
    let password = req.body.password;
    let email = req.body.email;
    console.log(`email is ${email} and password is ${password}`);
    // check we actually have values for email and password
    if (!(email && password)) {
        return res.redirect(url_module.format({
            pathname: "/register_admin",
            query: {
                "err_msg": "Both email and password are required"
            }
        }))
    }

    connectionPromise
    .then(client => {
        return client.db("blog_db").collection("admin_user").findOne({"email": email});
    })
    .then(result => {
        if (result) {
            return res.redirect(url_module.format({
                pathname: "/register_admin",
                query: {
                    "err_msg": "A user with the given email already exists"
                }
            }))
        }
    })
    .catch(error => {
        res.status(500).send("Internal server error, could not fetch user from db");
    })


    let encryptedPassword = await bcrypt.hash(password, 10);

    let adminUser = {
        "email": email,
        "password": encryptedPassword
    };

    connectionPromise
    .then(client => {
        return client.db("blog_db").collection("admin_user").insertOne(adminUser);
    })
    .then(result => {
        console.log(result);
    })
    .catch(error => {
        console.error(`Could not insert admin user, error: ${error}`);
        res.status(500).send("Internal server error, could not insert user into db");
    });

    res.redirect("/login_admin");
})

app.post("/login_form_handler", async (req, res) => {
    console.log("POST /login_form_handler");
    let inputPassword = req.body.password;
    let email = req.body.email;
    console.log(`email is ${email}, password is ${inputPassword}`);

    if (!(email && inputPassword)) {
        return res.redirect(url_module.format({
            pathname: "/login_admin",
            query: {
                "err_msg": "Both email and password are required"
            }
        }))
    }

    let client = await connectionPromise;
    let result = await client.db("blog_db").collection("admin_user").findOne({"email": email});
    console.log("result is ", result);
    if (result == null) {
        return res.redirect(url_module.format({
            pathname: "/login_admin",
            query: {
                "err_msg": "No user with given email exists"
            }
        }))
    }
    
    let dbPasswordHash = result.password;
    console.log(`dbPasswordHash is ${dbPasswordHash}`);
    let hashesMatch = await bcrypt.compare(inputPassword, dbPasswordHash);
    console.log(`hashesMatch is ${hashesMatch}`);
    
    if (!hashesMatch) {
        return res.redirect(url_module.format({
            pathname: "/login_admin",
            query: {
                "err_msg": "Wrong password"
            }
        }))
    }

    const authToken = jwt.sign(
        {email},
        credentials.page_login_key,
        {
            expiresIn: "1h",
        }
    );

    res.cookie("AuthToken", authToken);
    res.redirect("/protected");

})

app.get("/login_admin", (req, res) => {
    console.log("GET /login_admin");
    let err_msg = req.query.err_msg;
    console.log(`err_msg is ${err_msg}`);
    res.render("login_form", {err_msg: err_msg});
})

app.get("/register_admin", (req, res) => {
    console.log("GET /register_admin");
    let err_msg = req.query.err_msg;
    console.log(`err_msg is ${err_msg}`);
    res.render("registration_form", {err_msg: err_msg});
})

app.get("/protected", auth, (req, res) => {
    console.log("GET /protected");
    console.log(`req.user is ${req.user}`);
    if (req.user) {
        res.json({"login": "success"});
    }
    else {
        res.json({"login": "fail"});
    }
})

app.listen(3000, () => {
    console.log('http://localhost:3000');
  });