var cacheName = "v1"; // 更新版本号为 'v1' 或更高版本

// 监听 'install' 事件
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(cacheName).then(function (cache) {
      // 缓存应用程序所需的资源
      return cache.addAll([
        "/index.html",
        "/socket.js",
        "/index.js",
        "/camera.js",
        // 添加其他资源
      ]);
    })
  );
});

// 监听 'activate' 事件
self.addEventListener("activate", function (event) {
  event.waitUntil(
    // 清除旧版本的缓存
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function (name) {
            // 检查是否为旧版本的缓存名称
            return name !== cacheName;
          })
          .map(function (name) {
            // 删除旧版本的缓存
            return caches.delete(name);
          })
      );
    })
  );
});
