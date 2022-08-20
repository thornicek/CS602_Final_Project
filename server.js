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
let initDB = db_manager.initDB;

app.engine('handlebars', 
	engine({defaultLayout: 'main_paige'}));

app.set('view engine', 'handlebars');

// static resources
app.use(express.static(__dirname + '/public'));

// get articles from db
app.get('/', (req, res) => {
    console.log("GET /");
    connectionPromise
        .then(client => {
        return client.db("blog_db").collection('article').find({});
        })
        .then(cursor => {
            return cursor.toArray();
        })
        .then(results => {
            console.log(`${results.length} articles found to be displayed`);
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
app.post('/post-feedback/:id', (req, res) => {
    console.log("POST /post-feedback/:id");
    let paramData = req.params;
    let stringID = paramData.id;
    console.log(`stringID = ${stringID}`);
    connectionPromise
    .then(client => {
        return client.db("blog_db").collection('article').updateOne(
            {"_id":new ObjectId(stringID)},
            {$addToSet:{comments: req.body}});
    })
    .then(result => {
        res.redirect(`/article/${stringID}`)
    })
    .catch(error => {
        console.log(`An error occured while saving comment: ${error}`);
    })
    
});


// show "read more" single blog entry
app.get('/article/:id', (req, res) => {
    console.log("GET /article/:id");
    let paramData = req.params;
    let stringID = paramData.id;
    console.log(`stringID = ${stringID}`);
    connectionPromise
    .then(client => {
        return client.db("blog_db").collection('article').findOne({"_id": new ObjectId(stringID)});
    })
    .then(result => {
        result.id = stringID;
        res.render("display_single_blog", {data: result});
    })
    .catch(error => {
        console.log(`An error occured while fetching artcile: ${error}`);
    })
})

// endpoint to show all articles in XML and json
app.get('/api/article', (req, res) => {
    console.log("GET /api/article");
    connectionPromise
    .then(client =>{
        return client.db('blog_db').collection('article').find({});
    })
    .then(cursor => {
        return cursor.toArray();
    })
    .then(result => {
        res.format({
        'application/json': () => {
                res.json(result)
            },
        'application/xml': () => {
            let blogXml = `<?xml version="1.0"?>\n <article>`
            for (const entry of result){
                blogXml += `\n <title>${entry.title}</title> \n <content>${entry.content}</content>`
            }
            blogXml += `\n </article>`
            res.type('application/xml');
            res.send(blogXml);
        } 
        })
    })
    .catch(error => {
        console.log(`An error occured while fetching articles and converting to JSON/XML: ${error}`);
    })
})

// endpoint to show a single article
app.get('/api/article/:id', auth, (req, res) => {
    console.log("GET /api/article/:id");
    let paramData = req.params;
    let stringID = paramData.id;
    console.log(`stringID = ${stringID}`);
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
    .catch(error => {
        console.log(`An error occured while fetching single article and converting to JSON/XML: ${error}`);
    })
})

// admin view 
app.get('/admin', auth, (req, res) => {
    console.log("GET /admin");
    if (!req.user) {
        console.log("Unauthenticated user attempted to access admin page");
        return res.redirect(url_module.format({
            pathname: "/login",
            query: {
                "err_msg": "You must be logged in to view the admin page"
            }
        }))
    }
    console.log(`admin page for user ${req.user.email}`);
    
    connectionPromise
    .then(client => {
        // for admin display all articles, for other users only display their articles
        if (req.user.email === credentials.admin_email) {
            return client.db("blog_db").collection('article').find({});
        }
        else {
            return client.db("blog_db").collection('article').find({username: req.user.email});
        }
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
app.get('/admin/edit/:id', auth, async (req, res) => {
    console.log("GET /admin/edit/:id");
    if (!req.user) {
        console.log("Unauthenticated user attempted to access admin edit single article page");
        return res.redirect(url_module.format({
            pathname: "/login",
            query: {
                "err_msg": "You must be logged in to edit an article"
            }
        }))
    }
    console.log(`req.user.email is ${req.user.email}`);
    let paramData = req.params;
    let stringID = paramData.id;
    console.log(`stringID is ${stringID}`);
    let article;
    try {
        let client = await connectionPromise;
        article = await client.db('blog_db').collection('article').findOne({"_id": new ObjectId(stringID)});
    } catch (error) {
        console.log(`An error occured while fetching article: ${error}`);
    }
    
    if (req.user.email === credentials.admin_email || req.user.email === article.username)
    {
        res.render('display_admin_single', {data:article});
    } else {
        return res.redirect(url_module.format({
            pathname: "/login",
            query: {
                "err_msg": "You must be logged as the articles author or blog admin to view this page."
            }
        }))
    }
})
// admin update article
app.patch('/admin/update/:id', auth, async (req,res) => {
    console.log("PATCH /admin/update/:id");
    if (!req.user) {
        console.log("Unauthenticated user attempted to update article");
        return res.redirect(url_module.format({
            pathname: "/login",
            query: {
                "err_msg": "You must be logged in to edit an article"
            }
        }))
    }
    console.log(`req.user.email is ${req.user.email}`);
    let paramData = req.params;
    let stringID = paramData.id;
    let updateTitle = await req.body.title;
    let updateContent = await req.body.content;
    if (!(stringID && updateTitle && updateContent)) {
        res.status(400).send("id, new title and new content must be present!");
    }
    console.log(`stringID = ${stringID}, updateTitle=${updateTitle}, updateContent=${updateContent}`);
    try {
        let client = await connectionPromise;
        let article = await client.db("blog_db").collection("article").findOne({"_id": new ObjectId(stringID)});
        if (req.user.email === credentials.admin_email || req.user.email === article.username) {
            let updateResult = await client.db("blog_db").collection("article").updateOne(
                {"_id": new ObjectId(stringID)},
                {$set: {title: updateTitle, content: updateContent}}
            );
            console.log(`updateResult is ${updateResult}`);
            return res.status(204).send();
        } else {
            return res.redirect(url_module.format({
                pathname: "/login",
                query: {
                    "err_msg": "You must be logged in as author or admin to edit the article"
                }
            }))
        }
    } catch (error) {
        console.log(`An error occured while fetching and updating article: ${error}`);
    }
    
})
// admin delete 
app.delete('/admin/delete/:id', auth, async (req, res)=> {
    console.log("DELETE /admin/delete/:id")
    let paramData = req.params;
    let stringID = paramData.id;
    console.log(`stringID is ${stringID}`);
    if (!req.user) {
        console.log("Unauthenticated user attempted to update article");
        return res.redirect(url_module.format({
            pathname: "/login",
            query: {
                "err_msg": "You must be logged in to delete the article"
            }
        }))
    } 
    console.log(`req.user.email is ${req.user.email}`);
    try {
        let client = await connectionPromise;
        let article = await client.db("blog_db").collection("article").findOne({"_id": new ObjectId(stringID)});
        if (req.user.email === credentials.admin_email || req.user.email === article.username) {
            let deleteResult = await client.db('blog_db').collection('article').deleteOne(
                {"_id": new ObjectId(stringID)}
            );
            console.log(`deleteeResult is ${deleteResult}`);
            return res.status(204).send();
        } else {
            return res.redirect(url_module.format({
                pathname: "/login",
                query: {
                    "err_msg": "You must be logged in as author or admin to delete the article"
                }
            }))
        }
    } catch (error) {
        console.log(`An error occured while fetching and deleting article: ${error}`);
    }
    
})
// admin render add new article
app.get('/admin/add_new', auth, (req, res) => {
    console.log("GET /admin/add_new")
    if (!req.user) {
        console.log("Unauthenticated user attempted to update article");
        return res.redirect(url_module.format({
            pathname: "/login",
            query: {
                "err_msg": "You must be logged in to delete the article"
            }
        }))
    } else {
        console.log(`req.user.email is ${req.user.email}`);
        return res.render('display_admin_add');
    }
})


// admin add new article 
app.post('/admin/add_new', auth, (req,res) => {
    console.log("POST /admin/add_new");
    if (!req.user) {
        console.log("Unauthenticated user attempted to update article");
        return res.redirect(url_module.format({
            pathname: "/login",
            query: {
                "err_msg": "You must be logged in to delete the article"
            }
        }))
    } else {
        console.log(`req.user.email is ${req.user.email}`);
        newTitle = req.body.title;
        newContent = req.body.content;
        console.log(`newTitle is ${newTitle}, newContent is ${newContent}`);
        connectionPromise
        .then(client => {
            return client.db('blog_db').collection('article').insertOne({title: newTitle, username:req.user.email, content: newContent, comments: []});
        })
        .then(result => {
            res.redirect('/admin')
        })
        .catch(error => {
            console.log(`An error occurred while adding article to db: ${error}`);
        })
    }
    
})


// testing connection to db
app.get('/test_mongo', (req, res) => {
    console.log("GET /test_mongo")
    connectionPromise.then(client => {
        return client.db("test_db").collection("test_collection").find({});
    })
    .then(cursor => {
        return cursor.toArray();
    })
    .then(resultsArray => {
        const firstResult = resultsArray[0];
        console.log(`test collection result: ${firstResult}`);
        res.json(firstResult);
    })
    .catch(error => {
        console.error(`An error occured on /test_mongo: ${error}`);
        res.json({result: "fail"});
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
        res.status(500).send("Internal server error, could not fetch user from db: ", error);
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
    res.redirect("/admin");

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
    console.log("reg.user is: ", req.user);
    if (req.user) {
        res.json({"login": "success"});
    }
    else {
        res.json({"login": "fail"});
    }
})

app.listen(3000, () => {
    initDB();
    console.log('http://localhost:3000');
  });