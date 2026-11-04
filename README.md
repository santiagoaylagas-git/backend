# Backend — Sistema de Gestión de Turnos Médicos

Trabajo práctico integrador de Programación 2. API REST en Node.js + Express + MySQL.

- **Frontend (Angular 21):** https://github.com/santiagoaylagas-git/frontend
- **Guía paso a paso para levantar todo** (XAMPP, Visual Studio Code / Antigravity, problemas
  frecuentes): [`docs/GUIA-INSTALACION.md` del frontend](https://github.com/santiagoaylagas-git/frontend/blob/main/docs/GUIA-INSTALACION.md).

## Ramas

| Rama | Contenido |
|------|-----------|
| `main` | Versión final y vigente (igual a `entrega-backend`) |
| `entrega-backend` | Entrega final: semanas 1 a 4 + cambios para el frontend |
| `entrega-backend-4` | Semana 4: auditoría y reportes |
| `entrega-backend-3` | Semana 3: turnos, historial y notificaciones |
| `entrega-backend-2` | Semana 2: CRUD de sedes, especialidades, coberturas y agenda |

> Las ramas de las semanas 2 a 4 conservan la estructura original, con el código dentro de una
> subcarpeta `backend/`. Desde la entrega final el código está en la raíz del repositorio.

## Estructura de carpetas

```
backend/
├── README.md               Esta documentación
├── package.json            Dependencias y scripts (dev, start, db:importar)
├── .env.example            Variables de entorno de ejemplo (copiar a .env)
├── .vscode/                Tareas y depuración para VS Code / Antigravity
├── database/
│   └── clinica_ampliada.sql.txt   Tablas + datos de prueba (fechas relativas al día de importación)
├── postman/
│   └── clinica.postman_collection.json   Colección con 112 requests documentados y tests
├── scripts/
│   ├── importar-db.js      Recrea la base desde cero (npm run db:importar, cualquier SO)
│   └── importar-db.ps1     Alternativa con el cliente mysql de XAMPP (Windows)
└── src/
    ├── server.js           Arranca el servidor en el puerto del .env
    ├── app.js              Express: CORS, JSON, rutas, 404 y manejador global de errores
    ├── database/db.js      Pool de conexiones a MySQL
    ├── routes/             Qué URL va a qué controlador y con qué protección por rol
    ├── middlewares/        auth.js (token y rol) y auditoria.js (registro automático)
    ├── controllers/        Lógica de cada recurso (turnos, agenda, usuarios, reportes...)
    └── utils/              respuesta.js, fechas.js y notificaciones.js
```

## Requisitos

- Node.js `^20.19.0`, `^22.12.0` o `^24.0.0` (la misma versión que exige Angular 21 para el frontend; recomendado Node 24 LTS, probado con 24.22.1 y 22)
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

3. Crear la base de datos e importar el script provisto (`database/clinica_ampliada.sql.txt`). El script **recrea la base desde cero** cada vez que se corre.

   **Opción A — script con Node (recomendada, cualquier sistema operativo)**: usa las credenciales del `.env` y no necesita el cliente `mysql` en el PATH. Solo requiere que MySQL/MariaDB esté corriendo.

   ```bash
   npm run db:importar
   ```

   **Opción B — script de PowerShell** (requiere XAMPP en `C:\xampp`):

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\importar-db.ps1
   ```

   **Opción C — manual**, desde phpMyAdmin (crear la base `clinica` y luego Importar → `database/clinica_ampliada.sql.txt`) o por línea de comandos:

   ```bash
   mysql -u root -p -e "DROP DATABASE IF EXISTS clinica; CREATE DATABASE clinica"
   mysql -u root -p clinica < database/clinica_ampliada.sql.txt
   ```

   La agenda y los turnos de prueba se cargan con fechas **relativas al día de la importación**, así que conviene reimportar la base antes de cada demo para tener agenda y turnos "de hoy".

4. Levantar el servidor en modo desarrollo:

   ```bash
   npm run dev
   ```

   Por defecto queda escuchando en `http://localhost:3000`. Verificar con `GET /health` que devuelva `"db": "conectada"`.

## Usuarios de prueba (ya cargados por el script)

Todos usan la contraseña **`test1234`**:

| DNI        | Rol       | Nombre            | Datos                                                  |
|------------|-----------|-------------------|--------------------------------------------------------|
| `18222333` | admin     | Marcos Gómez      | Sin sede                                               |
| `20111222` | médico    | Ana López         | Traumatología y Clínica Médica — atiende en Sede Centro **y** Sede Norte |
| `22333444` | médico    | Carlos Martínez   | Cardiología — Sede Norte                               |
| `28444555` | médico    | Laura Fernández   | Pediatría y Dermatología — Sede Centro                 |
| `15200548` | operador  | Juan Pérez        | Sede Centro                                            |
| `33555666` | operador  | Sofía Díaz        | Sede Norte                                             |
| `36000960` | paciente  | Franco Friggeri   | Jerárquicos                                            |
| `40666777` | paciente  | Lucía Romero      | OSDE                                                   |
| `17777888` | paciente  | Martín Sosa       | Swiss Medical                                          |
| `55888999` | paciente  | Valentina Acosta  | Jerárquicos                                            |

La base trae además 3 sedes, 5 coberturas, 5 especialidades, agenda para hoy, días anteriores y próximos, y turnos en los tres estados (`confirmado`, `cancelado` y `atendido`, estos últimos con su historial clínico).

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

## Endpoints (semana 3)

Turnos, historial clínico y notificaciones, sobre la rama `entrega-backend-3`.

| Método | Endpoint                     | Descripción                                                                 | Protegido                                    |
|--------|-------------------------------|-------------------------------------------------------------------------------|------------------------------------------------|
| POST   | `/turnos`                     | Alta de turno (`id_especialidad`, `id_sede`, `id_medico`, `fecha`, `hora`, `nota`; `id_paciente` si lo pide un operador) | Sí — rol `paciente` (propio) u `operador` (su sede) |
| GET    | `/turnos/mios`                 | "Mis turnos" del paciente logueado, del más próximo al menos próximo          | Sí — rol `paciente`                             |
| GET    | `/turnos/medico?fecha=`        | Turnos programados del médico logueado para una fecha                        | Sí — rol `medico`                               |
| GET    | `/turnos/sede?fecha=`          | Turnos de la sede del operador logueado para una fecha                       | Sí — rol `operador`                             |
| PUT    | `/turnos/:id/cancelar`         | Cancela un turno (`estado = 'cancelado'`); notifica al paciente y al médico   | Sí — rol `paciente` (propio), `operador`/`medico` (su sede) |
| PUT    | `/turnos/:id/atender`          | Marca un turno como atendido (`estado = 'atendido'`); notifica al paciente    | Sí — rol `medico` (solo sus propios turnos)     |
| POST   | `/historial`                   | Registra diagnóstico/tratamiento/observaciones de un turno atendido           | Sí — rol `medico` (solo turnos que atendió)     |
| GET    | `/historial/:idPaciente`       | Historial clínico de un paciente                                              | Sí — `paciente` (el propio) o `medico` (solo lo que él atendió) |
| GET    | `/notificaciones`              | Notificaciones propias, de más reciente a más antigua                        | Sí (cualquier rol autenticado)                  |
| PUT    | `/notificaciones/:id/leida`    | Marca una notificación propia como leída                                      | Sí (cualquier rol autenticado, solo la propia)  |

Notas y decisiones de diseño:
- La disponibilidad del turno se valida contra la agenda del médico (rango `hora_entrada`–`hora_salida` de ese día) y contra otros turnos ya `confirmado` en el mismo horario; ambos casos devuelven un error controlado (`400`/`409`), nunca `500`.
- La cobertura del turno se toma siempre de `usuario.id_cobertura` del paciente; no se puede pisar desde el body del alta.
- "Atender turno" y "cargar historial clínico" quedaron como **endpoints separados** (la consigna lo deja a criterio del grupo); ambos registros quedan asociados por `id_turno`.
- Las notificaciones no tienen endpoint de alta público: se generan internamente al confirmar, cancelar o atender un turno (`src/utils/notificaciones.js`).

## Endpoints (semana 4)

Auditoría, reportes y cierre, sobre la rama `entrega-backend-4`.

| Método | Endpoint                                | Descripción                                                        | Protegido        |
|--------|------------------------------------------|---------------------------------------------------------------------|-------------------|
| GET    | `/auditoria`                             | Log de acciones sensibles, filtrable por `id_usuario`, `entidad`, `desde` y `hasta` | Sí — rol `admin` |
| GET    | `/reportes/turnos-por-especialidad`      | Cantidad de turnos agrupados por especialidad                        | Sí — rol `admin` |
| GET    | `/reportes/turnos-por-sede`              | Cantidad de turnos agrupados por sede                                | Sí — rol `admin` |
| GET    | `/reportes/ranking-medicos`              | Ranking completo de médicos por turnos atendidos                     | Sí — rol `admin` |
| GET    | `/reportes/tasa-cancelacion`             | Turnos cancelados sobre el total, con el porcentaje del período      | Sí — rol `admin` |

Los cuatro reportes aceptan `desde` y `hasta` (formato `AAAA-MM-DD`, ambos opcionales y combinables) como filtro sobre la fecha del turno, y devuelven el período aplicado junto con los datos.

Notas y decisiones de diseño:
- **La auditoría no se llama desde los controladores.** Se resuelve con el middleware `auditar(entidad)` (`src/middlewares/auditoria.js`), montado a nivel de router sobre sedes, especialidades, coberturas y usuarios. El middleware envuelve `res.json`, y cuando la respuesta es exitosa deriva la acción del método HTTP (`POST` → `ALTA`, `PUT` → `MODIFICACION`, `DELETE` → `BAJA`) y registra el log. Así se cumple el criterio de que no haya código repetido en cada endpoint.
- Si el registro de auditoría falla, se loguea el error pero no se rompe la operación principal, que ya fue respondida.
- En el alta pública de pacientes (`POST /auth/registro`) no hay usuario autenticado: el responsable de la acción es el propio usuario que acaba de crearse. Es el único caso en que `id_usuario` no sale del token.
- El detalle nunca incluye la contraseña, y se recorta a los 255 caracteres que admite la columna.

## Cierre y pulido

Además de lo pedido por las consignas semanales:
- **Manejador global de errores** en `src/app.js`: un body con JSON malformado devolvía el error HTML por defecto de Express, rompiendo el formato uniforme. Ahora responde `400` con la estructura de siempre. Los demás errores del cliente al leer el cuerpo responden su código real con la misma forma (`413` si es demasiado grande, `415` si la codificación no está soportada), y cualquier error no previsto responde `500`.
- **Fechas sin desplazamiento de zona horaria**: el pool usa `dateStrings: true`, de modo que las columnas `DATE` viajan como `AAAA-MM-DD` en lugar de convertirse a un timestamp UTC que corría el día según la zona horaria del cliente.

## Cambios para la entrega del frontend

Ajustes hechos en el backend para cubrir las pantallas del frontend, siguiendo las sugerencias de la consigna. Todos respetan la estructura de respuesta uniforme, están protegidos por rol y quedaron documentados en la carpeta **"Entrega frontend - Endpoints nuevos y cambios"** de la colección de Postman (37 requests con sus tests).

### Endpoints nuevos

| Método | Endpoint                         | Descripción                                                                                   | Protegido                         |
|--------|-----------------------------------|-----------------------------------------------------------------------------------------------|-----------------------------------|
| GET    | `/medicos`                        | Médicos con sus especialidades (sin datos personales). Filtros: `id_especialidad`, `id_sede`, `disponibles=1` | Cualquier usuario con sesión      |
| GET    | `/disponibilidad/fechas`          | Fechas (desde hoy) en que el médico tiene agenda y lugar, para `id_medico`, `id_especialidad`, `id_sede` | `paciente`, `operador`            |
| GET    | `/disponibilidad/horarios`        | Horarios libres de un día: agenda del médico en turnos de 30 min, menos los turnos confirmados | `paciente`, `operador`            |
| GET    | `/pacientes?q=`                   | Búsqueda de pacientes por DNI o apellido                                                      | `operador`, `medico`, `admin`     |
| PUT    | `/auth/perfil`                    | El paciente actualiza email, contraseña (hasheada), teléfono y cobertura                       | `paciente`                        |
| GET    | `/usuarios`                       | Listado paginado (`pagina`, `limite`) con filtros `nombre`, `apellido`, `rol`, `id_sede`      | `admin`                           |
| GET    | `/usuarios/:id`                   | Un usuario, con las especialidades si es médico                                               | `admin`                           |
| POST   | `/usuarios`                       | Alta de operador, médico (con especialidades) o administrador                                  | `admin` (auditado)                |
| PUT    | `/usuarios/:id`                   | Edición de cualquier usuario, incluidas las especialidades del médico                          | `admin` (auditado)                |
| GET    | `/auditoria/filtros`              | Usuarios con acciones registradas y entidades auditadas, para los filtros                      | `admin`                           |

### Endpoints modificados

- **`GET /sedes` y `GET /especialidades`**: ahora disponibles para cualquier usuario con sesión. El alta, la modificación y la baja siguen siendo exclusivas del administrador.
- **Agenda**:
  - El listado devuelve también `medico_nombre`, `medico_apellido`, `especialidad`, `sede` y `turnos_confirmados`; acepta además `desde` y `hasta`.
  - El operador solo puede dar de alta, modificar y eliminar rangos de **su sede** (`403` en otro caso). Consultar otras sedes sigue permitido.
  - Se valida que la salida sea posterior a la entrada, que la especialidad sea del médico y que el médico no tenga otro rango superpuesto ese día (en cualquier sede) → `409`.
  - No se puede **eliminar** un rango con turnos confirmados, ni **modificarlo** dejando algún turno confirmado afuera → `409` con un mensaje claro (nunca `500`).
  - Las altas, modificaciones y bajas de agenda también quedan en la auditoría.
- **Turnos**:
  - Cada turno dura **30 minutos**. El alta valida que la hora sea el inicio de un turno dentro de la agenda, la misma regla que usa `/disponibilidad/horarios`. También rechaza que el paciente tenga otro turno a la misma hora.
  - El médico opera sobre **sus propios turnos en cualquier sede** donde atiende (reemplaza la restricción "de su propia sede" de la semana 3).
  - `PUT /turnos/:id/atender` acepta opcionalmente `diagnostico`, `tratamiento` y `observaciones`, y registra el historial en la misma transacción. Sin body funciona como antes.
  - Los listados (`/mios`, `/medico`, `/sede`) devuelven los nombres del paciente, médico, especialidad y sede. `/mios` incluye el historial del turno si fue atendido. `/medico` acepta `id_sede`; `/sede` acepta `id_medico` y `estado`.
  - Al confirmar, cancelar o atender un turno se notifica al paciente, al médico y a quien realizó la acción (por ejemplo, el operador), para que su contador se actualice.
- **`GET /historial/:idPaciente`**: incluye fecha, hora, médico, especialidad y sede del turno. El médico sigue viendo solo lo que atendió él.
- **`GET /auth/perfil`**: incluye los nombres de la sede y la cobertura.
- **`POST /auth/registro`**: si lo usa un operador logueado (alta de pacientes), la auditoría lo registra a él como responsable. Valida el formato de los datos con las mismas reglas que el formulario del front y la gestión de usuarios (DNI de 7 u 8 dígitos, email válido, contraseña de al menos 6 caracteres, fecha de nacimiento no futura, etc.) → `400`.
- **Sedes, especialidades y coberturas**: el alta y la modificación validan que cada texto no supere el largo de su columna en la base (`nombre` de sede 50, `direccion` 100, `telefono` 15; `descripcion` y `nombre` de cobertura 30) → `400`, en lugar de truncarlo o fallar con `500`.
- **`GET /auditoria`**: con `pagina` (y `limite`) responde paginado `{ registros, total, pagina, limite }`; sin `pagina` sigue devolviendo el array completo.

### Base de datos

- Las claves pasaron de `TINYINT` a `INT`: con `TINYINT` cada tabla admitía como máximo 127 registros, y las notificaciones y la auditoría lo superaban enseguida.
- Datos de prueba ampliados (ver "Usuarios de prueba"), con fechas relativas al día de la importación.
- Nuevo script `npm run db:importar` para recrear la base desde cero en cualquier sistema operativo.

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
- `auditar(entidad)` (`src/middlewares/auditoria.js`): registra automáticamente las altas, bajas y modificaciones de la entidad indicada en `log_auditoria`, sin que los controladores tengan que llamarlo.

## Documentación de la API (Postman)

La documentación completa de la API está en la colección [`postman/clinica.postman_collection.json`](postman/clinica.postman_collection.json). **Cada uno de los 112 requests** incluye, en su pestaña de documentación, el rol que puede acceder al endpoint, los parámetros de ruta y de consulta, el body esperado y todas las respuestas posibles de éxito y error. La colección y cada carpeta tienen además su propia descripción.

Está organizada en ocho carpetas:

- **Semana 1 — Setup y autenticación** (12): `health`, `coberturas`, `registro`, `login`, `perfil`, `panel-admin`, con los casos 401 y 403.
- **Semana 2 — Sedes** (7), **Especialidades** (6), **Coberturas** (5) y **Agenda médica** (10): alta, listado, modificación y baja de cada entidad, con los casos de rol no autorizado (403) y de eliminación con dependencias (409).
- **Semana 3 — Turnos, historial y notificaciones** (20): alta de turno, rechazo por horario ocupado (409) y fuera de agenda (400), cancelación con notificación, atención con historial asociado, y las restricciones de acceso al historial.
- **Semana 4 — Auditoría y reportes** (15): consulta del log con cada filtro, los cuatro reportes con y sin rango de fechas, y los casos 400, 401 y 403.
- **Entrega frontend — Endpoints nuevos y cambios** (37): médicos, disponibilidad, búsqueda de pacientes, datos del paciente, gestión de usuarios, auditoría paginada y las nuevas validaciones de agenda y turnos.

Se puede correr **de punta a punta con "Run Collection"** sobre una base recién importada: los tokens (`token`, `token_admin`, `token_medico`, `token_operador`) y los IDs creados en cada alta se guardan solos en variables de colección a partir de las respuestas, sin pasos manuales.

Conviene reimportar la base antes de correrla, para que los reportes y el log de auditoría partan de los datos de prueba conocidos.
