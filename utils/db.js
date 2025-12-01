import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/salud-plus';
    
    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    // In development, continue without database for testing
    console.warn('⚠️ Running in demo mode without database persistence');
    return null;
  }
};

export default connectDB;
