# Backend — Sistema de Gestión de Turnos Médicos

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

## Endpoints (semana 2)

CRUD de sedes, especialidades, coberturas y agenda médica, sobre la rama `entrega-backend-2`.

| Método | Endpoint                | Descripción                                              | Protegido                                  |
|--------|--------------------------|-----------------------------------------------------------|---------------------------------------------|
| POST   | `/sedes`                 | Alta de sede (`nombre`, `direccion`, `telefono`)           | Sí — rol `admin`                            |
| GET    | `/sedes`                 | Listado de sedes                                           | Sí — rol `admin`                            |
| PUT    | `/sedes/:id`             | Modificación de sede                                        | Sí — rol `admin`                            |
| DELETE | `/sedes/:id`             | Baja de sede (409 si tiene médicos/operadores/agenda)       | Sí — rol `admin`                            |
| POST   | `/especialidades`        | Alta de especialidad (`descripcion`)                        | Sí — rol `admin`                            |
| GET    | `/especialidades`        | Listado de especialidades                                   | Sí — rol `admin`                            |
| PUT    | `/especialidades/:id`    | Modificación de especialidad                                 | Sí — rol `admin`                            |
| DELETE | `/especialidades/:id`    | Baja de especialidad (409 si tiene médicos/agenda asociada)  | Sí — rol `admin`                            |
| POST   | `/coberturas`            | Alta de cobertura (`nombre`)                                | Sí — rol `admin`                            |
| PUT    | `/coberturas/:id`        | Modificación de cobertura                                    | Sí — rol `admin`                            |
| DELETE | `/coberturas/:id`        | Baja de cobertura (409 si tiene usuarios/turnos asociados)   | Sí — rol `admin`                            |
| POST   | `/agenda`                | Alta de agenda (`hora_entrada`, `hora_salida`, `fecha`, `id_medico`, `id_especialidad`, `id_sede`) | Sí — rol `medico` (solo la propia) u `operador` |
| GET    | `/agenda`                | Listado filtrable por `id_medico`, `id_sede`, `fecha` (query params) | Sí — rol `medico` (solo la propia) u `operador` |
| PUT    | `/agenda/:id`            | Modificación de un turno de agenda                           | Sí — rol `medico` (solo la propia) u `operador` |
| DELETE | `/agenda/:id`            | Baja de un turno de agenda (409 si tiene turnos de pacientes asociados) | Sí — rol `medico` (solo la propia) u `operador` |

Notas:
- `GET /coberturas` (sin autenticación) se mantiene como servicio de solo lectura reutilizado desde el registro de pacientes (semana 1); el alta/modificación/baja de coberturas es la parte nueva, restringida a `admin`.
- Un médico que intenta gestionar la agenda de otro médico recibe `403`. Un `paciente` no tiene acceso a ningún endpoint de agenda.
- Las bajas nunca devuelven `500` por una dependencia existente: siempre `409` con el mensaje correspondiente.

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

Colección en [`postman/clinica.postman_collection.json`](postman/clinica.postman_collection.json), organizada en carpetas:

- **Semana 1 — Setup y autenticación**: `health`, `coberturas`, `registro`, `login`, `perfil`, `panel-admin` (con los tres roles y casos 401/403).
- **Semana 2 — Sedes / Especialidades / Coberturas / Agenda médica**: alta, listado, modificación y baja de cada entidad, con los casos de rol no autorizado (403) y de eliminación con dependencias (409).

Se puede correr **toda la colección de punta a punta con "Run Collection"** sobre una base recién importada: los tokens (`token`, `token_admin`, `token_medico`, `token_operador`) y los IDs creados en cada alta (`sede_id`, `especialidad_id`, `cobertura_id`, `agenda_id`) se guardan solos en variables de colección a partir de las respuestas, sin pasos manuales.
