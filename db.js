const {MongoClient} = require('mongodb');
const credentials = require("./credentials.js");
const dbUrl = 'mongodb://' + credentials.username + ':' + credentials.password + '@' + credentials.host + ':' + credentials.port + '/' + credentials.database;

async function get_db_promise() {
    try {
        let mongoclient = await new MongoClient(dbUrl);
        let connectionPromise = await mongoclient.connect();
        return connectionPromise;
    } catch(error) {
        console.error(`Error connecting to database: ${error}`);
    }
    
}

let connectionPromise = get_db_promise();

let sampleArticles = [
    {
        username: "john.doe@gmail.com",
        title: "How to make a REST API using Node, Express and MongoDB",
        content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Consequuntur ea ad ipsam iste quas nisi perspiciatis omnis est, nostrum reiciendis vitae consectetur ipsum itaque, hic, temporibus dolores provident eveniet impedit! Repudiandae iusto cumque voluptas. Ad id, ducimus nobis repellendus itaque eaque at recusandae sapiente fugit. Veniam, voluptas eligendi voluptatem rerum ex assumenda, optio qui est architecto aliquam corporis sint, iure voluptate sed consequatur officia fugiat. Corrupti blanditiis voluptatem eligendi repellat laboriosam mollitia possimus aut voluptas nesciunt expedita quasi vitae neque commodi cupiditate, culpa labore facilis quas aliquam quidem quos. Omnis quam, est mollitia repudiandae eaque sunt ipsam voluptatibus harum adipisci.",
        comments: []
    },
    {
        username: "jane.doe@gmail.com",
        title: "The basics of HTTP",
        content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quis blanditiis, debitis laboriosam consequatur reiciendis quisquam impedit aperiam, unde cum nostrum nobis quo odio, quas in? Id eaque ipsam ut pariatur fugiat aliquam ipsa? Necessitatibus iste, nostrum possimus ipsa culpa praesentium accusantium repellat itaque odio fugit? Iusto voluptas, voluptatum vel illo eum excepturi modi maiores temporibus enim explicabo illum. Nam itaque aut vel accusamus consectetur, natus at! Veniam animi corrupti minima cumque quam alias nostrum ad aspernatur numquam deserunt, voluptatibus rem delectus, incidunt iusto beatae libero ullam quas nam voluptatum ut nobis, assumenda voluptate vel. Vitae animi architecto nostrum soluta ipsa.",
        comments: []
    },
    {
        username: "andy.smith@gmail.com",
        title: "The advantages and disadvantage of NoSQL databases",
        content: "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Nihil magnam voluptas ad animi tempora laudantium, quam iusto non corrupti ullam qui, debitis eveniet reiciendis nostrum? Non harum reprehenderit facere ducimus ab vitae dignissimos fugiat eveniet quibusdam esse deserunt animi obcaecati voluptas nemo tenetur, explicabo, eum, quidem adipisci culpa. Tenetur quidem blanditiis et eveniet? Magnam est dolorem maxime! Repudiandae culpa eveniet odit commodi necessitatibus? Doloremque provident saepe in quae consectetur fugit tempora harum sed ducimus nulla voluptatibus cumque aperiam quibusdam inventore culpa earum odit a aliquid, beatae alias, fuga dolore delectus! Obcaecati temporibus molestias adipisci cum laborum, in cupiditate. Ipsa, eaque?",
        comments: []
    }
]

// add sample articles to database if none are present and add test document for /test_mongo endpoint
async function initDB() {
    try {
        let client = await connectionPromise;
        let cursor = await client.db("blog_db").collection("article").find({});
        let articlesArray = await cursor.toArray();
        if (articlesArray.length < 1) {
            let insertResult = await client.db("blog_db").collection("article").insertMany(sampleArticles);
            console.log(`init_db, ${insertResult.insertedCount} articles were added`);
        }

        let test_document = {result: "success"};

        let testCollectionResult = await client.db("test_db").collection("test_collection").findOne(test_document);

        if (!testCollectionResult) {
            let insertResult = await client.db("test_db").collection("test_collection").insertOne(test_document);
            console.log("test document inserted");
        }
    } catch(error) {
        console.error(`Error initializing database: ${error}`);
    }
    
    
}



module.exports = {
    connectionPromise: connectionPromise,
    initDB: initDB
}
