import express, { Application } from 'express';
import fs from 'fs';
import path from 'path';
import http from 'http';
import config from './config/config';
import { initSocket } from './utils/socket/socket';

// Security and Middleware imports
import cookieParser from 'cookie-parser';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import prisma from './utils/prisma/prisma-client';
import PathNotFound from './helpers/responses/path-not-found';
import { loggerStream } from './utils/logger/logger';

// Terminal colors
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const WHITE = '\x1b[37m';
const RESET = '\x1b[0m';

// Express app initialization
const app: Application = express();

// Define the path to the public directory
const publicDirPath = path.join(__dirname, '..', 'public');

app.use(express.json({ limit: config.MAX_JSON_SIZE }));

app.use(express.urlencoded({ extended: config.URL_ENCODED }));
app.use(cookieParser());
app.use(fileUpload(config.EXPRESS_FILE_UPLOAD_CONFIG));

// Security middleware initialization
app.use(cors());
app.use(helmet());
// Removed MongoDB-specific query sanitizer for SQL compatibility
app.use(hpp());
app.use(morgan('dev'));

// Use Morgan with the custom logger
app.use(morgan('combined', { stream: loggerStream }));

// Request Rate Limiting
app.use(
  rateLimit({
    windowMs: config.REQUEST_LIMIT_TIME,
    max: config.NODE_ENV !== 'production' ? Infinity : config.REQUEST_LIMIT_NUMBER,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Serve static files from the public directory
app.use(
  express.static(publicDirPath, {
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

// Recursive function to load routes from nested folders
const routes: {
  module: string;
  path: string;
  method: string;
  time: number;
}[] = [];

const loadRoutes = (basePath: string, baseRoute: string) => {
  if (fs.existsSync(basePath)) {
    fs.readdirSync(basePath).forEach((item: string) => {
      const itemPath = path.join(basePath, item);

      const routePrefix = `${baseRoute}/${item.replace('.route', '')}`;

      const start = performance.now();
      if (fs.statSync(itemPath).isDirectory()) {
        loadRoutes(itemPath, routePrefix);
      } else if (item.endsWith('.route.ts') || item.endsWith('.route.js')) {
        const routeModule = require(itemPath);
        app.use(baseRoute, routeModule);

        if (config.NODE_ENV !== 'production') {
          const end = performance.now();
          routeModule.stack.forEach((layer: any) => {
            if (layer.route) {
              Object.keys(layer.route.methods).forEach((method) => {
                routes.push({
                  module: item.split('.')[0],
                  path: `${baseRoute}${layer.route.path}`,
                  method: method.toUpperCase(),
                  time: end - start,
                });
              });
            }
          });
        }
      }
    });
  }
};

// Load routes starting from the 'modules' directory
const routesPath = path.join(__dirname, 'modules');
loadRoutes(routesPath, '/api/v1');

// Path not found handler
app.use(PathNotFound);

// Helper: formatted date
const getFormattedDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Helper: formatted time
const getFormattedTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
};

// ────────────────────────────────────────────────
// Log routes grouped by module
// ────────────────────────────────────────────────
function logRoutesByModule() {
  const grouped: Record<string, any[]> = {};

  routes.forEach((route) => {
    if (!grouped[route.module]) grouped[route.module] = [];
    grouped[route.module].push(route);
  });

  Object.entries(grouped).forEach(([module, routeList]) => {
    console.log(
      `${YELLOW}======================= ${module.toUpperCase()} =======================${RESET}\n`
    );

    routeList.forEach((route: any) => {
      const info = `${GREEN}${route.method} ${route.path} - ${YELLOW}${route.time.toFixed(2)} ms${RESET}`;
      console.log(
        `${GREEN}[Express] ${WHITE}${getFormattedDate()} ${getFormattedTime()} ${GREEN}LOG ${YELLOW}[RouterExplorer] ${info}${RESET}`
      );
    });

    console.log(`\n${YELLOW}======================== END ========================${RESET}\n`);
  });
}

// Create HTTP server instead of listening directly on app
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

server.listen(config.PORT, async () => {
  // Connect to PostgreSQL via Prisma
  await prisma.$connect();
  console.log(
    `${GREEN}✔${RESET} ${WHITE}Connected to PostgreSQL successfully.${RESET}\n`,
    `${GREEN}✔${RESET} ${WHITE}Connected to Redis successfully.${RESET}\n`,
    `${BLUE}🚀  Server Details:${RESET}\n`,
    `Base URL: ${YELLOW}${config.BASE_URL}:${config.PORT}${RESET}\n`,
    `Environment: ${YELLOW}${config.NODE_ENV}${RESET}\n`,
    `Port: ${YELLOW}${config.PORT}${RESET}\n`
  );
  console.log(`Server is running at ${config.BASE_URL}:${config.PORT} in ${config.NODE_ENV} mode.`);
  logRoutesByModule();
});
