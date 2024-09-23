const CACHE_NAME = 'my-cache-v5'; // 使用固定的版本号
const RESOURCES_TO_CACHE = [
    'assets/js/script.js',
    'assets/css/styles.css',
    // 'offline.html' // 确保有一个离线页面
];

// 安装事件
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(RESOURCES_TO_CACHE);
        })
    );
    self.skipWaiting(); // 立即激活新的 Service Worker
});

// 激活事件
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME]; // 只保留当前版本的缓存
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName); // 删除旧缓存
                    }
                })
            );
        })
    );
});

// 获取事件
self.addEventListener('fetch', event => {
    const isMobile = /Mobi|Android/i.test(event.request.headers.get('User-Agent'));

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // 如果缓存中有匹配的请求，返回缓存的响应
                if (response) {
                    return response;
                }

                // 否则，发起网络请求
                return fetch(event.request).then(networkResponse => {
                    // 检查网络响应是否有效
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }
                    if (isMobile) {

                        // 只缓存 HTML 文件
                        if (event.request.destination === 'document'
                            // || event.request.url.endsWith('.html')
                            || event.request.url.endsWith('.js')
                            || event.request.url.endsWith('.css')) {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                    } else {
                        if (event.request.destination === 'document'
                            || event.request.url.endsWith('.gz')) {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                        } 
                    }

                    return networkResponse;
                });
            })
    );
});


// 监听更新事件
self.addEventListener('message', (event) => {
    const isSmallScreen = /Mobi|Android/i.test(event.request.headers.get('User-Agent'));
    if (isSmallScreen) {
        const resourcesToExcludeRegex = /assets\/dicts\/.*\.dat\.gz$/;
        caches.open(CACHE_NAME).then(cache => {
            // 获取所有缓存的请求
            cache.keys().then(requests => {
                requests.forEach(request => {
                    // 检查请求的 URL 是否匹配正则表达式
                    if (resourcesToExcludeRegex.test(request.url)) {
                        cache.delete(request).then(() => {
                            console.log(`Deleted: ${request.url}`);
                        });
                    }
                });
            });
        });
    }
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting(); // 立即激活新的 Service Worker
    }
});
