# semilleros-lazox-newsletter

Servicio de Newsletter (API) para registrar suscriptores, consultar el listado y enviar notificación por correo cuando se registra un nuevo suscriptor.

## Características

- **Ping** para ver estado del servicio: `GET /ping`.
- **Listado de suscriptores**: `GET /subscribers` (lee de Postgres vía Neon).
- **Registro de suscriptor**: `POST /register` (inserta en Postgres y envía correo con Nodemailer).

## Requisitos

- Node.js 18+ recomendado.
- Base de datos Postgres accesible (ej. Neon) con la tabla `suscriptores`.

Tabla esperada (campos deducidos del código):

```sql
CREATE TABLE IF NOT EXISTS suscriptores (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  correo TEXT UNIQUE NOT NULL,
  telefono TEXT,
  mensaje TEXT,
  origen TEXT,
  creado_en TIMESTAMP DEFAULT NOW()
);
```

## Instalación

1. Clonar el repositorio y entrar al directorio del proyecto.
2. Instalar dependencias:

```bash
npm install
```

## Variables de entorno

Crear un archivo `.env` en la raíz con las siguientes variables:

- `PORT` (opcional, por defecto 4242): Puerto del servidor local.
- `DATABASE_URL` (requerida): Cadena de conexión a Postgres (formato compatible con Neon y `@neondatabase/serverless`).
- `EMAIL_USER` (requerida): Cuenta de correo remitente (ej. Gmail) usada por Nodemailer.
- `EMAIL_PASS` (requerida): Contraseña o App Password del proveedor de correo.

Ejemplo (no usar en producción):

```env
PORT=4242
DATABASE_URL=postgres://user:password@host:5432/dbname
EMAIL_USER=tu-correo@gmail.com
EMAIL_PASS=app-password-o-credencial
```

Notas:

- Si usas Gmail, se recomienda configurar un App Password con 2FA habilitado.
- No commitees el archivo `.env`.

## Scripts

- `npm run dev`: Ejecuta con `nodemon` para recarga en desarrollo.
- `npm start`: Ejecuta el servidor con Node.

## Ejecución local

1. Configura `.env` como se indica.
2. Inicia el servidor en desarrollo:

```bash
npm run dev
```

El servidor quedará en `http://localhost:4242` salvo que cambies `PORT`.

## Endpoints

- `GET /ping`
  - Respuesta: `"👍"`

- `GET /subscribers`
  - Respuesta: Lista JSON con los registros de `suscriptores`.

- `POST /register`
  - Body JSON:
    ```json
    {
      "nombre": "Juan Pérez",
      "correo": "juan@example.com",
      "telefono": "+52 55 1234 5678",
      "mensaje": "Quiero más información",
      "origen": "landing"
    }
    ```
  - Validaciones: `nombre` y `correo` son requeridos.
  - Respuestas:
    - `201 Created`: Retorna el registro insertado.
    - `409 Conflict`: Si el `correo` ya existe (código Postgres `23505`).
    - `500 Internal Server Error` en caso de error general.

### Ejemplos con curl

```bash
# Ping
curl http://localhost:4242/ping

# Listar suscriptores
curl http://localhost:4242/subscribers

# Registrar suscriptor
curl -X POST http://localhost:4242/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "correo": "juan@example.com",
    "telefono": "+52 55 1234 5678",
    "mensaje": "Quiero más información",
    "origen": "landing"
  }'
```

## Correo de notificación

El servicio usa Nodemailer para enviar un correo de notificación con los datos del nuevo registro. El destinatario actual está configurado en el código (`index.js`) en el campo `to` del `mailOptions`. Ajusta ese valor según tus necesidades.

## Despliegue en Vercel

Se incluye `vercel.json` con la configuración básica:

```json
{
  "version": 2,
  "builds": [{ "src": "index.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "/" }]
}
```

Pasos recomendados:

- **Variables de entorno**: Configúralas en el Dashboard de Vercel (PROJECT SETTINGS → Environment Variables).
- **Start file**: `index.js` exporta un servidor Express; Vercel lo manejará como Serverless Function.
- **Pruebas post-deploy**: Verifica `GET /ping` en la URL de despliegue.

## Seguridad y buenas prácticas

- No exponer `EMAIL_PASS` ni `DATABASE_URL` públicamente.
- Usar App Passwords en proveedores de correo.
- Validar y sanitizar inputs si se agregan nuevos campos.
- Manejar CORS según los orígenes permitidos de tu frontend.

## Licencia

ISC
