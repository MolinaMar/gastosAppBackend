const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const { connectDB, mongoose } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
// Conexión a la base de datos
connectDB();

app.use(express.json());
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  })
);
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const UsuarioSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    apellidoPaterno: { type: String, required: true },
    apellidoMaterno: { type: String, required: true },
    correo: { type: String, required: true, unique: true },
    contrasena: { type: String, required: true },
    Active: { type: Boolean, default: false },
  },
  { collection: 'usuarios' }
);

const Usuario = mongoose.model('Usuario', UsuarioSchema);

const GastoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    precio: { type: Number, required: true },
    cantidad: { type: Number, required: true },
    correo: { type: String, required: true },
  },
  { collection: 'gastos', timestamps: true }
);

const Gasto = mongoose.model('Gasto', GastoSchema);

app.get('/', (req, res) => {
  res.json({ mensaje: 'Backend funcionando correctamente' });
});

app.post('/api/register', async (req, res) => {
  try {
    const {
      nombre,
      apellidoPaterno,
      apellidoMaterno,
      correo,
      contrasena,
    } = req.body;

    if (!nombre || !apellidoPaterno || !apellidoMaterno || !correo || !contrasena) {
      return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
    }

    const existente = await Usuario.findOne({ correo });
    if (existente) {
      return res.status(409).json({ mensaje: 'El correo ya está registrado' });
    }

    const hash = await bcrypt.hash(contrasena, 10);
    const nuevo = new Usuario({
      nombre,
      apellidoPaterno,
      apellidoMaterno,
      correo,
      contrasena: hash,
      Active: false,
    });
    await nuevo.save();
    return res.status(201).json({ mensaje: 'Registro exitoso', usuarioId: nuevo._id });
  } catch (error) {
    console.error('Error en /api/register:', error);
    return res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { correo, contrasena } = req.body;
    if (!correo || !contrasena) {
      return res.status(400).json({ mensaje: 'Correo y contraseña son obligatorios' });
    }

    const usuario = await Usuario.findOne({ correo });
    if (!usuario) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    const ok = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!ok) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    await Usuario.updateOne({ _id: usuario._id }, { $set: { Active: true } });
    return res.json({
      mensaje: 'Inicio de sesión exitoso',
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        apellidoPaterno: usuario.apellidoPaterno,
        apellidoMaterno: usuario.apellidoMaterno,
        correo: usuario.correo,
        Active: true,
      },
    });
  } catch (error) {
    console.error('Error en /api/login:', error);
    return res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

app.post('/api/logout', async (req, res) => {
  try {
    const { correo } = req.body;
    if (!correo) return res.status(400).json({ mensaje: 'Correo es obligatorio' });
    const usuario = await Usuario.findOne({ correo });
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    await Usuario.updateOne({ _id: usuario._id }, { $set: { Active: false } });
    return res.json({ mensaje: 'Sesión cerrada', usuarioId: usuario._id });
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

Usuario.updateMany({}, { $unset: { createdAt: '', updatedAt: '' } }).catch(() => {});

app.post('/api/gastos', async (req, res) => {
  try {
    const { nombre, precio, cantidad, correo } = req.body;
    if (!nombre || precio === undefined || cantidad === undefined || !correo) {
      return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
    }
    const p = Number(precio);
    const c = Number(cantidad);
    if (Number.isNaN(p) || Number.isNaN(c)) {
      return res.status(400).json({ mensaje: 'Precio y cantidad deben ser números' });
    }
    const nuevo = new Gasto({ nombre, precio: p, cantidad: c, correo });
    await nuevo.save();
    return res.status(201).json({ mensaje: 'Gasto creado', gastoId: nuevo._id });
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

app.get('/api/gastos', async (req, res) => {
  try {
    const { correo } = req.query;
    if (!correo) return res.status(400).json({ mensaje: 'Correo es obligatorio' });
    const gastos = await Gasto.find({ correo }).sort({ createdAt: -1 });
    return res.json(gastos);
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

app.put('/api/gastos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, precio, cantidad, correo } = req.body;
    if (!correo) return res.status(400).json({ mensaje: 'Correo es obligatorio' });
    const update = {};
    if (nombre !== undefined) update.nombre = nombre;
    if (precio !== undefined) {
      const p = Number(precio);
      if (Number.isNaN(p)) return res.status(400).json({ mensaje: 'Precio inválido' });
      update.precio = p;
    }
    if (cantidad !== undefined) {
      const c = Number(cantidad);
      if (Number.isNaN(c)) return res.status(400).json({ mensaje: 'Cantidad inválida' });
      update.cantidad = c;
    }
    const actualizado = await Gasto.findOneAndUpdate({ _id: id, correo }, update, { new: true });
    if (!actualizado) return res.status(404).json({ mensaje: 'Gasto no encontrado' });
    return res.json({ mensaje: 'Gasto actualizado', gasto: actualizado });
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

app.delete('/api/gastos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { correo } = req.query;
    if (!correo) return res.status(400).json({ mensaje: 'Correo es obligatorio' });
    const eliminado = await Gasto.findOneAndDelete({ _id: id, correo });
    if (!eliminado) return res.status(404).json({ mensaje: 'Gasto no encontrado' });
    return res.json({ mensaje: 'Gasto eliminado' });
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
