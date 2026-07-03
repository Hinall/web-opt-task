import express from 'express';
import { chatBasic, chatStream } from '../controllers/ai.controller.js';

const router = express.Router();

router.post('/chat', chatBasic);
router.post('/chat/stream', chatStream);

export default router;
