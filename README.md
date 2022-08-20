# My Final Project

For my final project, I decided to make a blogging application, using Express and MongoDB. Features include:
 - A regular view of the blog for unauthenticated users
 - The ability for unauthenticated users to leave comments on articles
 - The ability for users to register their own accounts and contribute to the blog. User passwords are stored hashed, to increase security of the website. Authentication is then handled using JSON Web Tokens. When the user logs in with their correct credentials, a JWT is created and injected into their cookies. The JWT is set to expire in one hour. If you want to test both authenticated and unauthenticated views of pages, you can use anonymous browsing mode. Pages which should only be available to authenticated users will redirect to the login page if an unauthenticated user attempts to browse them.
 - An 'admin' view for authenticated users. There are two different types of admin views. One is for the owner of the page and one is for any other users. To see the website from the owner's POV, you need to register and log in using the admin_email set in credentials.js. To see the website from any other authenticated user's point of view, register and log in using any other email. The owner of the page will be able to see, edit and delete articles from any user. Any other users will only be able to see, edit and delete their own articles.
- Two REST API endpoints to get all articles, or a single article in either JSON or XML format. 

## In order to run the project:
In order to run the project, you need to have MongoDB running on the correct port, with the correct user credentials, as defined in credentials.js. If you already have docker installed in your machine, you can run the commands given in mongo_docker_commands.md in order to get your MongoDB running with the correct configuration. Once MongoDB is running, you can simply run the application in the normal way:
```
node server.js
```
Upon starting the application, three sample articles will be added automatically using the initDB function in db.js. Another document will also be added for the /test_mongo endpoint. The /test_mongo endpoint is a convenient way to test whether you've set up your MongoDB correctly in the previous steps. You can then do all the things unauthenticated users can do. In order to access parts of the page protected by authentication, you can register and log in either as the owner of the website, or a contributor (as explained in the 'features' part above).