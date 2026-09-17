# Puerto.App 📍

Aplicación Web Progresiva (PWA) de mapas colaborativos y geolocalización en vivo, orientada a grupos cerrados para compartir ubicaciones en tiempo real y emitir alertas inteligentes basadas en proximidad física.

---

## 🚀 Descripción del Proyecto

**Puerto.App** resuelve el seguimiento entre amigos en salidas o eventos masivos mediante un mapa interactivo liviano y sin costos de APIs propietarias. La plataforma detecta automáticamente la cercanía entre los integrantes conectados y notifica al grupo sin generar ruido visual innecesario.

---

## ✨ Características Principales

* **Geolocalización en Tiempo Real:** Emisión continua de coordenadas mediante la API nativa del navegador (`navigator.geolocation.watchPosition`) y sincronización bidireccional instantánea.
* **Mapas 100% Gratuitos y Offline:** Integración de Leaflet.js con mosaicos de OpenStreetMap, cacheados por un Service Worker para permitir visualización sin conexión.
* **Alertas Inteligentes de Proximidad (< 25 m):** Cálculo de distancia sobre la curvatura terrestre mediante la fórmula de Haversine ejecutada en el servidor.
* **Filtro Selectivo y Antispam:**
  * **Regla de Exclusión:** Cuando dos usuarios se encuentran, la notificación se envía únicamente a los demás miembros del grupo (los que se acaban de encontrar no reciben el aviso redundante).
  * **Cooldown:** Ventana de enfriamiento de 5 minutos por par de usuarios para evitar alertas repetitivas mientras permanecen en reposo juntos.
* **Seguridad y Validación:** Validación estricta de esquemas numéricos de latitud/longitud en backend para prevenir spoofing o saturación de datos corruptos.

