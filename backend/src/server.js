require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

const servidor = app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

servidor.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `El puerto ${PORT} ya está en uso: probablemente el backend ya está corriendo en otra terminal. ` +
        'Cerrala o cambiá PORT en el archivo .env.'
    );
  } else {
    console.error('No se pudo iniciar el servidor:', error.message);
  }
  process.exit(1);
});
