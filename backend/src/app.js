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

module.exports = app;
