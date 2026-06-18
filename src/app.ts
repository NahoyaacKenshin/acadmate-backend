import express, { Request, Response, /*NextFunction*/ } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ENV } from '@/config/env';
import routes from '@/routes';

const app = express();

const corsOrigin: cors.CorsOptions['origin'] = (origin, callback) => {
  if (!origin || ENV.FRONTEND_URLS.includes(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`Origin ${origin} is not allowed by CORS`));
};

const healthPayload = () => ({
  status: 'success',
  message: `${ENV.APP_NAME} instance is healthy`,
  timestamp: new Date().toISOString(),
  environment: ENV.NODE_ENV
});

// --- Core Middleware ---
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Simple Health Check ---
app.get('/', (req: Request, res: Response) => {
  res.status(200).json(healthPayload());
});

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json(healthPayload());
});

// --- Routes Folder Prepared ---
app.use('/api', routes);

// --- 404 Handler ---
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// --- Global Error Handler ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use((err: any, req: Request, res: Response, /*_next: NextFunction*/) => {
  console.error('🔥 Global Error Hook:', err.message);
  
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    status: 'error',
    message: ENV.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    ...(ENV.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

export default app;
