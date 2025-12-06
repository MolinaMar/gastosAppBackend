const mongoose = require('mongoose');

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URL ||
  'mongodb://127.0.0.1:27017/gastosappdb';

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Conectado a MongoDB');
  } catch (err) {
    console.error('Error conectando a MongoDB:', err.message);
    process.exit(1);
  }
}

module.exports = { connectDB, mongoose };
