## How to Deploy it ?
1. Recommended Way
   1. install Docker
   2. check line 10 in demos/live_video/socket.js and point the url to your destinated url, e.g. `http://localhost:8080`
   3. open the folder in terminal and type command `docker build -t realtime-handwash .`
   4. type command `docker run -p 1234:1234 -d --restart always realtime-handwash` , or operate in Docker Desktop if your OS supports.
2. Traditional Way
   1. install nvm & nginx if none of them installed
   2. install `lts/hydrogen` though nvm
   3. open the folder in terminal and type `cd demos/live_video;yarn run create;cd demos/live_video;yarn` to install all dependencies
   4. check line 10 in demos/live_video/socket.js and point the url to your destinated url, e.g. `http://localhost:8080`
   5. type `yarn run watch` in demos/live_video directory
   6. reverse proxying using nginx

## How to Run it ?
1. Recommended Way
   1. install Docker
   2. check line 10 in demos/live_video/socket.js and point the url to your destinated url, e.g. `http://localhost:8080`
   3. open the folder in terminal and type command `docker build -t realtime-handwash .`
   4. type command `docker run -p 1234:1234 -d --restart always realtime-handwash` , or operate in Docker Desktop if your OS supports.
2. Traditional Way
   1. Refer to the REMDE.md
