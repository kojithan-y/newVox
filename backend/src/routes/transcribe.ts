import { Router } from 'express';
import multer from 'multer';
import { transcribeWithChirp } from '../services/chirpService';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('audio/')) {
      cb(new Error('Only audio files are allowed.'));
      return;
    }
    cb(null, true);
  },
});

export const transcribeRouter = Router();

transcribeRouter.post('/', upload.single('audio'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file?.buffer) {
      res.status(400).json({ message: 'Audio file is required under field "audio".' });
      return;
    }

    const voiceType = (req.body.voiceType as string) || 'multilingual';
    const transcript = await transcribeWithChirp(file.buffer, file.mimetype || '', voiceType);
    res.json({ transcript });
  } catch (error) {
    next(error);
  }
});
