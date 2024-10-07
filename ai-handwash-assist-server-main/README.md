Endpoint:
|path|descriptioin|format & type|
|----|----|----|
|`/user/info/fill`|this is used to recieved input info and build profile for student for further operations, required info: ID, subject for subject code, department|`{ID:string,subject:string,department:string}`|
|`/data/record/append_rating`|used to append rating, it is help to calculate the ranking later. So the `is_last` is optional, indicate will it calculate the total score. the id should be received from the `/user/info/fill`, while the rating is the `perfect`,`you can do better` and `good` determined in the frontend|`{id:string,rating:string,is_last:boolean}`|
|`/data/record/get_rank`|used to get the rank among the data using the given id|`{id:string}`|

## How to Deploy it ?
1. Recommended Way
   1. install [Docker](https://docs.docker.com/get-started/get-docker/)
   2. open the folder in terminal and type command `docker build -t handwash-assist .`
   3. type command `docker run -p 8080:3000 -d --restart always handwash-assist` , or operate in Docker Desktop if your OS supports.
2. Traditional Way
   1. install [nvm](https://github.com/nvm-sh/nvm?tab=readme-ov-file#install--update-script) & nginx if none of them installed
   2. install `lts/hydrogen` though nvm
   3. open the folder in terminal and type `npm i` to install all dependencies
   4. check line 8 in config/config.default.js and change the link into the mongodb you are using.
   5. type `node server` to start running.
