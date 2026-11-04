# Sistema de Gestión de Turnos Médicos — Backend

Trabajo práctico integrador de Programación 2. API REST en Node.js + Express + MySQL.

- `backend/` — código de la API. **Instrucciones completas, endpoints y cambios para el
  frontend en [`backend/README.md`](backend/README.md).**
- `backend/postman/` — colección de Postman (112 requests documentados con tests).
- `clinica_ampliada.sql.txt` — script de la base de datos con los datos de prueba.

Frontend (Angular 21): https://github.com/santiagoaylagas-git/frontend (rama `entrega-frontend`).

## Inicio rápido

```bash
cd backend
npm install
cp .env.example .env     # completar credenciales de MySQL y JWT_SECRET
npm run db:importar      # crea la base "clinica" desde cero con los datos de prueba
npm run dev              # http://localhost:3000
```

Usuarios de prueba (contraseña `test1234`): admin `18222333`, médico `20111222`,
operador `15200548`, paciente `36000960`. La lista completa está en `backend/README.md`.
