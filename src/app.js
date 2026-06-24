import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { randomUUID } from 'crypto';
import routes from './routes/index.routes.js';

import { errorHandler, notFound } from './middlewares/error.middleware.js';

const app = express();

// Middlewares globales
app.use(helmet()); // Protege la app configurando varios encabezados HTTP
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
); // Permite peticiones cruzadas (CORS) desde tu frontend
app.use(express.json()); // Permite a la API recibir datos en formato JSON
app.use(morgan('dev')); // Muestra un log de las peticiones en la terminal

app.use((req, _res, next) => {
  req.id = randomUUID();
  next();
});

// Ruta de prueba 
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'La API de Mindshift está funcionando correctamente',
    request_id: req.id,
  });
});

// Rutas centralizadas
app.use('/api', routes);

// Si la petición llega hasta aquí, es porque ninguna ruta coincidió
app.use(notFound);

// Si algún middleware o ruta hace un next(error), cae aquí
app.use(errorHandler);

export default app;
