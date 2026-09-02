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
- **Manejador global de errores** en `src/app.js`: un body con JSON malformado devolvía el error HTML por defecto de Express, rompiendo el formato uniforme. Ahora responde `400` con la estructura de siempre, y cualquier error no previsto responde `500` con la misma forma.
- **Fechas sin desplazamiento de zona horaria**: el pool usa `dateStrings: true`, de modo que las columnas `DATE` viajan como `AAAA-MM-DD` en lugar de convertirse a un timestamp UTC que corría el día según la zona horaria del cliente.

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

La documentación completa de la API está en la colección [`postman/clinica.postman_collection.json`](postman/clinica.postman_collection.json). **Cada uno de los 75 requests** incluye, en su pestaña de documentación, el rol que puede acceder al endpoint, los parámetros de ruta y de consulta, el body esperado y todas las respuestas posibles de éxito y error. La colección y cada carpeta tienen además su propia descripción.

Está organizada en siete carpetas:

- **Semana 1 — Setup y autenticación** (12): `health`, `coberturas`, `registro`, `login`, `perfil`, `panel-admin`, con los casos 401 y 403.
- **Semana 2 — Sedes** (7), **Especialidades** (6), **Coberturas** (5) y **Agenda médica** (10): alta, listado, modificación y baja de cada entidad, con los casos de rol no autorizado (403) y de eliminación con dependencias (409).
- **Semana 3 — Turnos, historial y notificaciones** (20): alta de turno, rechazo por horario ocupado (409) y fuera de agenda (400), cancelación con notificación, atención con historial asociado, y las restricciones de acceso al historial.
- **Semana 4 — Auditoría y reportes** (15): consulta del log con cada filtro, los cuatro reportes con y sin rango de fechas, y los casos 400, 401 y 403.

Se puede correr **de punta a punta con "Run Collection"** sobre una base recién importada: los tokens (`token`, `token_admin`, `token_medico`, `token_operador`) y los IDs creados en cada alta se guardan solos en variables de colección a partir de las respuestas, sin pasos manuales.

Conviene reimportar la base antes de correrla, para que los reportes y el log de auditoría partan de los datos de prueba conocidos.
