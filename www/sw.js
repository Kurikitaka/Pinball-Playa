// Cache para jugar sin conexion
var CACHE='pinball-playa-v1';
var FILES=['./','index.html','geom.js','physics.js','render.js','game.js','manifest.webmanifest','img/bg.png','img/charger.png','img/icon-192.png','img/icon-512.png','img/lh0.png','img/lh1.png','img/lh2.png','img/play.png','img/slings.png','snd/bonus.wav','snd/bumper0.wav','snd/bumper1.wav','snd/bumper2.wav','snd/drain.wav','snd/flipdown.wav','snd/flipperhit.wav','snd/flipup.wav','snd/gameover.wav','snd/gear.wav','snd/launch.wav','snd/light.wav','snd/pull.wav','snd/save.wav','snd/sling.wav','snd/start.wav','snd/target.wav','snd/wall.wav','snd/waves.wav'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(FILES);}));self.skipWaiting();});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));}));self.clients.claim();});
self.addEventListener('fetch',function(e){e.respondWith(caches.match(e.request).then(function(r){return r||fetch(e.request);}));});
