# Puerto.App 📍

Aplicación Web Progresiva (PWA) de mapas colaborativos y geolocalización en vivo, orientada a grupos cerrados para compartir ubicaciones en tiempo real y emitir alertas inteligentes basadas en proximidad física.

---

## 🚀 Descripción del Proyecto

**Puerto.App** resuelve el seguimiento entre amigos en salidas o eventos masivos mediante un mapa interactivo liviano y sin costos de APIs propietarias. La plataforma detecta automáticamente la cercanía entre los integrantes conectados y notifica al grupo sin generar ruido visual innecesario.

* **URL Frontend:** [https://ldenis06.github.io/Puerto.App/](https://ldenis06.github.io/Puerto.App/)
* **Backend:** Desplegado en [Render](https://render.com/) vía WebSockets (Socket.io).

---

## ✨ Características Principales

* **Geolocalización en Tiempo Real:** Emisión continua de coordenadas mediante la API nativa del navegador (`navigator.geolocation.watchPosition`) y sincronización bidireccional instantánea.
* **Mapas 100% Gratuitos y Offline:** Integración de Leaflet.js con mosaicos de OpenStreetMap, cacheados por un Service Worker para permitir visualización sin conexión.
* **Alertas Inteligentes de Proximidad (< 25 m):** Cálculo de distancia sobre la curvatura terrestre mediante la fórmula de Haversine ejecutada en el servidor.
* **Filtro Selectivo y Antispam:**
  * **Regla de Exclusión:** Cuando dos usuarios se encuentran, la notificación se envía únicamente a los demás miembros del grupo (los que se acaban de encontrar no reciben el aviso redundante).
  * **Cooldown:** Ventana de enfriamiento de 5 minutos por par de usuarios para evitar alertas repetitivas mientras permanecen en reposo juntos.
* **Seguridad y Validación:** Validación estricta de esquemas numéricos de latitud/longitud en backend para prevenir spoofing o saturación de datos corruptos.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, JavaScript (ES6+) | Interfaz liviana y responsive |
| **PWA / Cache** | Service Workers & Cache API | Soporte offline y funcionamiento como app móvil |
| **Mapas** | [Leaflet.js](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/) | Renderizado y manipulación de capas geográficas |
| **Backend** | [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/) | Servidor de eventos y validación de esquemas |
| **Comunicación** | [Socket.io](https://socket.io/) | Canal de WebSockets bidireccional de baja latencia |
| **Hosting** | GitHub Pages (Frontend) & Render (Backend) | Despliegue continuo en la nube |

---

## 📐 Lógica del Negocio (Haversine & Proximidad)

El servidor procesa el evento `location:update` y calcula periódicamente la distancia entre cada par de usuarios conectados:

$$d = 2R \cdot \operatorname{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$

Donde $R = 6.371\text{ km}$ y:

$$a = \sin^2\left(\frac{\Delta\varphi}{2}\right) + \cos(\varphi_1)\cos(\varphi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$

* Si $d \le 25\text{ m}$ y transcurrió el tiempo de cooldown, se emite el evento `proximity:alert`.

---

## 💻 Instalación y Uso Local

### 1. Clonar el repositorio
```bash
git clone [https://github.com/Ldenis06/Puerto.App.git](https://github.com/Ldenis06/Puerto.App.git)
cd Puerto.App
