# Backend — Semana 1 (Setup, conexión y autenticación)

Sistema de Gestión de Turnos Médicos — Programación 2.

## Requisitos

- Node.js 18+
- MySQL o MariaDB corriendo localmente (por ejemplo, vía XAMPP)

## Setup

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar `.env.example` a `.env` y completar las credenciales de la base y el secreto de JWT:

   ```bash
   cp .env.example .env
   ```

   Si MySQL/XAMPP corre con la configuración por defecto (usuario `root` sin contraseña), no hace falta tocar nada más que el `JWT_SECRET`.

3. Crear la base de datos e importar el script provisto (`../clinica_ampliada.sql.txt`, un nivel arriba de esta carpeta).

   **Opción A — script automático** (lee las credenciales del `.env`, requiere XAMPP en `C:\xampp`):

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\importar-db.ps1
   ```

   **Opción B — manual**, desde phpMyAdmin (Importar → `clinica_ampliada.sql.txt`) o por línea de comandos:

   ```bash
   mysql -u root -p -e "CREATE DATABASE clinica"
   mysql -u root -p clinica < ../clinica_ampliada.sql.txt
   ```

4. Levantar el servidor en modo desarrollo:

   ```bash
   npm run dev
   ```

   Por defecto queda escuchando en `http://localhost:3000`. Verificar con `GET /health` que devuelva `"db": "conectada"`.

## Usuarios de prueba (ya cargados por el script)

El script de base incluye 4 usuarios con distintos roles, todos con la contraseña **`test1234`**:

| DNI        | Rol       | Nombre         |
|------------|-----------|----------------|
| `15200548` | operador  | Juan Pérez     |
| `36000960` | paciente  | Franco Friggeri|
| `20111222` | médico    | Ana López      |
| `18222333` | admin     | Marcos Gómez   |

Sirven para probar `POST /auth/login` y los endpoints protegidos sin necesidad de registrar un usuario nuevo primero.

## Endpoints (semana 1)

| Método | Endpoint            | Descripción                                        | Protegido           |
|--------|---------------------|-----------------------------------------------------|---------------------|
| GET    | `/health`           | Prueba la conexión a la base de datos                | No                  |
| GET    | `/coberturas`        | Lista las coberturas disponibles                     | No                  |
| POST   | `/auth/registro`     | Registra un paciente (rol `paciente` automático)     | No                  |
| POST   | `/auth/login`        | Login con `dni` y `password`, devuelve JWT           | No                  |
| GET    | `/auth/perfil`       | Datos del usuario logueado                           | Sí (JWT)            |
| GET    | `/auth/panel-admin`  | Endpoint de prueba solo para rol `admin`             | Sí (JWT + rol admin)|

## Formato de respuesta

Todas las respuestas siguen la estructura uniforme definida en el enunciado general:

```json
{
  "codigo": 200,
  "estado": "ok",
  "datos": { ... }
}
```

## Middlewares de seguridad

- `verificarToken` (`src/middlewares/auth.js`): responde `401` si falta el token o es inválido/vencido. Probado en `/auth/perfil` y `/auth/panel-admin`.
- `verificarRol(...roles)`: responde `403` si el rol del usuario no está permitido para el endpoint. Probado en `/auth/panel-admin` (solo rol `admin`).

## Postman

Colección en [`postman/clinica.postman_collection.json`](postman/clinica.postman_collection.json), con las pruebas de:

- `health`, `coberturas`
- `registro`, `login`
- `perfil` (con y sin token → 200 / 401)
- `panel-admin` (con rol admin, con rol paciente y sin token → 200 / 403 / 401)

Se puede correr toda la colección de punta a punta con **Run Collection**: los tokens se guardan solos en variables de colección (`token`, `token_admin`) a partir de las respuestas de login.
