# Variables de entorno y Google OAuth

Guía rápida para dejar el login con Google funcionando en local. **No guardes secretos reales en este archivo**: úsalo como referencia y copia los valores solo en tu `.env` (que está en `.gitignore`).

---

## 1. Crear el archivo `.env`

En la raíz del proyecto (`the-hard-blok-tpv/`):

1. Copia la plantilla:  
   `cp .env.example .env`  
   (En Windows PowerShell: `Copy-Item .env.example .env`)
2. Abre `.env` y sustituye los placeholders por tus valores reales.

---

## 2. Lista de claves / variables

| Variable | ¿Obligatoria? | Qué es |
|----------|---------------|--------|
| `DATABASE_URL` | Sí | Cadena de conexión PostgreSQL para la app y Better Auth. |
| `BETTER_AUTH_SECRET` | Sí | Secreto para firmar cookies/sesiones: **mínimo 32 caracteres** aleatorios. |
| `BETTER_AUTH_URL` | Sí | URL pública base de la app (Better Auth la usa para OAuth y cookies). En local: `http://localhost:3000`. |
| `GOOGLE_CLIENT_ID` | Sí para Google | ID de cliente OAuth 2.0 (tipo “Aplicación web”) en Google Cloud. |
| `GOOGLE_CLIENT_SECRET` | Sí para Google | Secreto del cliente OAuth (solo en servidor, nunca en el frontend). |
| `GOOGLE_DEFAULT_ROLE` | No | Rol por defecto en tu tabla `users` para usuarios nuevos por Google: `cashier` (por defecto), `owner`, `admin` o `manager`. |

### Plantilla `.env` (copia y rellena)

```env
DATABASE_URL=postgres://USUARIO:CONTRASEÑA@localhost:5432/NOMBRE_BD

BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=CAMBIA_ESTO_POR_AL_MENOS_32_CARACTERES_ALEATORIOS

GOOGLE_CLIENT_ID=tu-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret

# Opcional:
# GOOGLE_DEFAULT_ROLE=cashier
```

### Generar `BETTER_AUTH_SECRET` (64 hex)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Pega el resultado en `BETTER_AUTH_SECRET=...`.

---

## 3. Google Cloud Console (paso a paso corto)

1. Entra en [Google Cloud Console](https://console.cloud.google.com/) y crea o elige un proyecto.
2. **APIs y servicios** → **Pantalla de consentimiento de OAuth** (configura tipo “Externo” o el que aplique y guarda).
3. **APIs y servicios** → **Credenciales** → **Crear credenciales** → **ID de cliente de OAuth** → tipo **Aplicación web**.
4. En **URIs de redireccionamiento autorizados**, añade exactamente:
   - Desarrollo: `http://localhost:3000/api/auth/callback/google`
   - Producción (cuando la tengas): `https://TU_DOMINIO/api/auth/callback/google`
5. Copia **ID de cliente** → `GOOGLE_CLIENT_ID` en `.env`.  
   Copia **Secreto del cliente** → `GOOGLE_CLIENT_SECRET` en `.env`.

Guarda el `.env`, **reinicia** el servidor (`Ctrl+C` y `npm run dev`). Si cambias Google u otras variables de auth, un reinicio evita cachés raras en desarrollo.

---

## 4. Base de datos (recordatorio)

Orden típico en una base nueva:

1. **`npm run db:schema`** — tablas de la app (`users` con `google_sub`, `sessions`, `categories`, `products`). Ver `db/schema.sql`.
2. **`npm run db:auth-migrate`** — tablas de Better Auth (`user`, `session`, `account`, `verification`).
3. Opcional: **`npm run db:seed`** — usuario admin por contraseña (`db/seed_admin.sql`).

Detalle en la sección **Auth Setup** del `README.md`.

---

## 5. Seguridad

- **No subas** `.env` a git ni lo pegues en chats públicos.
- **No escribas** `GOOGLE_CLIENT_SECRET` ni contraseñas de base de datos en este `.md` con valores reales: mantenlos solo en `.env` o en un gestor de secretos.
- Si un secreto se filtró, **revócalo** en Google Cloud y genera otro; cambia contraseña de BD si aplica.

---

## 6. Comprobar que va bien

- Arranca: `npm run dev` (puerto **3000** si usas la URL de ejemplo).
- Abre `/login`: el botón **Continuar con Google** debe estar activo si `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` están rellenados.
- Tras iniciar sesión, deberías llegar al dashboard (o la URL de `callbackURL`).

Si algo falla, mira la terminal donde corre Vite: suele aparecer el error real (BD, migraciones, redirect URI incorrecto, etc.).
