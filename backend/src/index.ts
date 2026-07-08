import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { transcribeRouter } from './routes/transcribe';

const app = express();

app.use(cors());
app.use(express.json({ limit: '25mb' }));

app.get('/', (_req, res) => {
  res.json({
    name: 'newvoxapp-backend',
    status: 'ok',
    endpoints: {
      health: { method: 'GET', path: '/health' },
      transcribe: { method: 'POST', path: '/api/transcribe', multipartField: 'audio' },
    },
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/transcribe', transcribeRouter);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${env.port}`);
});
