import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import aiRoutes from './routes/ai.routes.js';

dotenv.config();

const requiredEnv = ['AI_API_KEY', 'AI_BASE_URL', 'AI_MODEL'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]?.trim());
if (missingEnv.length > 0) {
  console.error(`Missing required environment variable(s): ${missingEnv.join(', ')}`);
  process.exit(1);
}

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api', aiRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

// 404 handler
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(` Server running on port ${PORT}`));