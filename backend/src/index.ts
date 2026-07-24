import cors from 'cors';
import express from 'express';
import { WebSocketServer } from 'ws';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { transcribeRouter } from './routes/transcribe';
import { createSpeechStream } from './services/chirpService';

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

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${env.port}`);
});
server.timeout = 180000;

// Setup WebSocket server for streaming transcription
const wss = new WebSocketServer({ server, path: '/api/stream' });

wss.on('connection', (ws) => {
  // eslint-disable-next-line no-console
  console.log('WebSocket client connected for live transcription');
  let speechStream: any = null;

  ws.on('message', (message, isBinary) => {
    if (!isBinary) {
      // Config message (text) E.g. { voiceType: 'multilingual' }
      try {
        const config = JSON.parse(message.toString());
        const voiceType = config.voiceType || 'multilingual';

        if (speechStream) {
          speechStream.end();
          speechStream = null;
        }

        speechStream = createSpeechStream(
          voiceType,
          (data) => {
            // eslint-disable-next-line no-console
            console.log(`Live Transcript: ${data.transcript} (isFinal: ${data.isFinal})`);
            ws.send(
              JSON.stringify({
                type: 'transcript',
                transcript: data.transcript,
                isFinal: data.isFinal,
              })
            );
          },
          (err) => {
            // eslint-disable-next-line no-console
            console.error('Google Speech Stream error:', err);
            ws.send(JSON.stringify({ type: 'error', message: err.message }));
          }
        );
      } catch (err: any) {
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to initialize streaming' }));
      }
    } else {
      // Audio chunk (binary - LINEAR16, 16kHz, mono)
      if (speechStream && !speechStream.destroyed) {
        speechStream.write(message);
      }
    }
  });

  ws.on('close', () => {
    // eslint-disable-next-line no-console
    console.log('WebSocket client disconnected');
    if (speechStream) {
      speechStream.end();
      speechStream = null;
    }
  });

  ws.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('WebSocket client error:', err);
    if (speechStream) {
      speechStream.end();
      speechStream = null;
    }
  });
});

