import express from 'express';
import { chatBasic, chatStream, chatWithTools } from '../controllers/ai.controller.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.post('/chat', chatBasic);
router.post('/chat/stream', chatStream);
router.post('/chat/tools', protect, chatWithTools);

export default router;
