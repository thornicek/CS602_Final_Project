# On first start:

```
docker run -d -p 27017:27017 --name mongo_finalP -v mongo-data:/data/db -e MONGODB_INITDB_ROOT_USERNAME=thornicek -e MONGODB_INITDB_ROOT_PASSWORD=secret mongo:latest
```
The credentials above need to match the credentials in credentials.js. Then run:
```
docker exec -it mongo_finalP bash
```

then into the docker container's terminal type: 
```mongo```

Then, in order to add the DB admin user with the proper credentials:
```
use admin
```
followed by:


```
db.createUser({user: "thornicek", pwd: "secret", roles: ["userAdminAnyDatabase"]})
```
The credentials above will again need to match credentials in credentials.js:

# On subsequent starts:

```
docker start mongo_finalP
```