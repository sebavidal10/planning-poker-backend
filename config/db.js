const mongoose = require('mongoose');

const connectDB = async () => {
  const {
    MONGO_URI,
    MONGO_PROTOCOL,
    MONGO_HOST,
    MONGO_PORT,
    MONGO_DB_NAME,
    MONGO_USERNAME,
    MONGO_PASSWORD,
  } = process.env;

  let mongoURI = MONGO_URI;

  if (!mongoURI) {
    // Standard connection string construction
    const auth =
      MONGO_USERNAME && MONGO_PASSWORD
        ? `${MONGO_USERNAME}:${encodeURIComponent(MONGO_PASSWORD)}@`
        : '';
    const port = MONGO_PORT ? `:${MONGO_PORT}` : '';
    const authSource = MONGO_USERNAME ? '?authSource=admin' : '';

    mongoURI = `${MONGO_PROTOCOL}://${auth}${MONGO_HOST}${port}/${MONGO_DB_NAME}${authSource}`;
  }

  if (!mongoURI || mongoURI.includes('undefined')) {
    console.error('CRITICAL: MongoDB URI construction failed. Check .env');
    if (process.env.NODE_ENV !== 'test') process.exit(1);
    return;
  }

  try {
    // Use the most stable configuration for modern Mongoose/MongoDB Driver
    await mongoose.connect(mongoURI);
    console.log('✅ Successfully connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    if (process.env.NODE_ENV !== 'test') process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

module.exports = connectDB;
