const CACHE_NAME = 'agaseke-cache-v1'
const STATIC_ASSETS = [
  '/',
  '/org',
  '/offline',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (url.origin !== self.location.origin) return

  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/api/')
  ) {
    event.respondWith(fetch(request))
    return
  }

  if (
    url.pathname.match(/\.(jpg|jpeg|png|gif|svg|ico|webp|woff2?|ttf|eot|css|js)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetchAndCache(request))
    )
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => caches.match(request).then((cached) => {
        return cached || caches.match('/offline')
      }))
  )
})

function fetchAndCache(request) {
  return fetch(request).then((response) => {
    if (response.ok) {
      const clone = response.clone()
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
    }
    return response
  })
}

self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: data.icon || '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        url: data.url || '/org',
      },
    }
    event.waitUntil(self.registration.showNotification(data.title, options))
  }
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const url = event.notification.data?.url || '/org'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
