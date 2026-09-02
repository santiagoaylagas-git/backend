const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { responder } = require('./utils/respuesta');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/', routes);

app.use((req, res) => {
  responder(res, 404, 'Recurso no encontrado');
});

// Manejador global de errores: garantiza que incluso los fallos no previstos
// respeten la estructura uniforme de respuesta.
app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') {
    return responder(res, 400, 'El cuerpo de la petición no es un JSON válido');
  }

  console.error(error);
  return responder(res, 500, 'Error interno del servidor');
});

module.exports = app;
