const { esFechaValida, ahoraLocal } = require('./fechas');

// Valida los datos personales de un usuario (registro, alta y modificacion).
// Los limites coinciden con las columnas de la tabla usuario y con el formulario del front.
// Devuelve el mensaje de error o null.
function validarDatosPersonales(datos, { passwordObligatoria }) {
  const { nombre, apellido, dni, email, fecha_nacimiento, telefono, password } = datos;

  if (!nombre || !apellido || !dni || !email || !fecha_nacimiento) {
    return 'Faltan datos obligatorios: nombre, apellido, dni, email, fecha_nacimiento';
  }
  if (String(nombre).length > 30 || String(apellido).length > 30) {
    return 'El nombre y el apellido no pueden superar los 30 caracteres';
  }
  if (!/^\d{7,8}$/.test(String(dni))) {
    return 'El DNI debe tener 7 u 8 dígitos numéricos';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email)) || String(email).length > 30) {
    return 'El email no es válido (máximo 30 caracteres)';
  }
  if (!esFechaValida(fecha_nacimiento) || fecha_nacimiento > ahoraLocal().fecha) {
    return 'La fecha de nacimiento debe tener formato AAAA-MM-DD y no puede ser futura';
  }
  if (telefono && !/^\d{6,10}$/.test(String(telefono))) {
    return 'El teléfono debe tener entre 6 y 10 dígitos';
  }
  if (passwordObligatoria && !password) {
    return 'Falta el dato obligatorio: password';
  }
  if (password && String(password).length < 6) {
    return 'La contraseña debe tener al menos 6 caracteres';
  }
  return null;
}

// Valida que cada campo de texto no supere el largo de su columna en la base.
// limites: { campo: largoMaximo }. Devuelve el mensaje de error o null.
function validarLargos(datos, limites) {
  for (const [campo, maximo] of Object.entries(limites)) {
    if (datos[campo] !== undefined && datos[campo] !== null && String(datos[campo]).length > maximo) {
      return `El campo ${campo} no puede superar los ${maximo} caracteres`;
    }
  }
  return null;
}

module.exports = { validarDatosPersonales, validarLargos };
