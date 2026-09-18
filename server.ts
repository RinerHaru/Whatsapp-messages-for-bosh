import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { downloadSpreadsheetFromServer } from './server/spreadsheetDownloader';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Habilitar parsing de JSON para peticiones con URL
  app.use(express.json({ limit: '50mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Endpoint para descargar libros de Excel y Google Sheets de forma segura y sin problemas de CORS
  app.post('/api/fetch-spreadsheet', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ success: false, error: 'Por favor ingresa una URL válida.' });
      }

      const result = await downloadSpreadsheetFromServer(url);

      if (result.isBinary && result.buffer) {
        return res.json({
          success: true,
          isBinary: true,
          filename: result.filename,
          contentType: result.contentType,
          base64: result.buffer.toString('base64'),
        });
      } else {
        return res.json({
          success: true,
          isBinary: false,
          filename: result.filename,
          contentType: result.contentType,
          text: result.text || '',
        });
      }
    } catch (err: any) {
      console.error('Error al procesar la planilla desde la URL:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Error al descargar la planilla desde la nube.',
      });
    }
  });

  // Vite middleware para entorno de desarrollo y archivos estáticos en producción
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
