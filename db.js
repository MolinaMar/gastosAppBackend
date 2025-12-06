const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://mongo:rxRcvNBKAuYrnltEtALpONsgPuGrqdBb@crossover.proxy.rlwy.net:21591';

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
