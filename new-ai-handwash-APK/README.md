# vue3_hands

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run dev
```

### Compiles and minifies for production
```
npm run build
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).


## How to Deploy it ?
1. Recommended Way
   1. install [Docker](https://docs.docker.com/get-started/get-docker/)
   2. check line 6 in src/services/socket.js and point the url to your destinated url of the handtracker, while line 4 in src/utils/axiosInstance.js to your destinated url for other features such as ranking and login, e.g. `http://localhost:8081`
   3. open the folder in terminal and type command `docker build -t handwash .`
   4. type command `docker run -p 8081:80 -d --restart always handwash` , or operate in Docker Desktop if your OS supports.
2. Traditional Way
   1. install [nvm](https://github.com/nvm-sh/nvm?tab=readme-ov-file#install--update-script) & nginx if none of them installed
   2. install `lts/hydrogen` though nvm
   3. open the folder in terminal and type `npm i` to install all dependencies
   4. check line 6 in src/services/socket.js and point the url to your destinated url of the handtracker, while line 4 in src/utils/axiosInstance.js to your destinated url for other features such as ranking and login, e.g. `http://localhost:8081`
   5. type `npm run build` to build for production
   6. host the built file using nginx
## How to Build APK ?
1. open the code in terminal and type `npm i` for installing the dependencies
2. check line 6 in src/services/socket.js and point the url to your destinated url of the handtracker, while line 4 in src/utils/axiosInstance.js to your destinated url for other features such as ranking and login, e.g. `http://localhost:8081`
3. using `npx cap init && npm run build && npx cap copy && npx cap add android && npx cap open android` command to build packages, then open and work with android studio
4. paste the following xml tags under the `<!--Permissions-->` in android/app/src/main/AndroidManifest.xml
![Screenshot 2024-09-11 175901](https://github.com/user-attachments/assets/c14503b1-4868-4f0f-afe6-0c825fe202a3)

```xml
<uses-permission android:name="android.permission.INTERNET" /> <!-- 网络权限 -->

<uses-permission android:name="android.permission.CAMERA" /> <!-- 摄像头权限 -->
<uses-feature android:name="android.hardware.camera" />

<uses-permission android:name="android.permission.RECORD_AUDIO" /> <!-- 录制音频权限 -->

<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" /> <!-- 写入外部存储权限 -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" /> <!-- 读取外部存储权限 -->
```
5. build the apk by selecting the menu like the following image
![Screenshot 2024-09-11 180505](https://github.com/user-attachments/assets/f46fa627-dbed-4138-a86a-80591cdf8ee6)
