export const config = {
  app: {
    port: process.env.PORT,
    env: process.env.NODE_ENV || "development",
    serverMode: process.env.SERVER_MODE || "auto",
  },
  psql: {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    url: process.env.DB_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET as string,
    expiry: process.env.JWT_EXPIRES || "15m",
    refreshExpiry: process.env.REFRESH_EXPIRES || "7d",
    refreshSecret: process.env.REFRESH_SECRET as string,
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 3306,
    user: process.env.REDIS_USER,
    password: process.env.REDIS_PASSWORD,
    url: process.env.REDIS_URL,
  },
  logging: {
    level: process.env.LOG_LEVEL || "info",
    pretty: process.env.NODE_ENV === "development",
  },
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
    credentials: true,
  },
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || "100"),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || "60000"), // 1 minute
  },
  queue: {
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || "5"),
  },
  performance: {
    compressionThreshold: 1024,
    staticMaxAge: 31536000,
  },
};

export const validateConfig = () => {
  const errors: string[] = [];

  if (!config.jwt.secret || config.jwt.secret === "your-jwt-secret") {
    errors.push("JWT_SECRET must be set in production");
  }

  if (
    !config.jwt.refreshSecret ||
    config.jwt.refreshSecret === "your-refresh-secret"
  ) {
    errors.push("JWT_REFRESH_SECRET must be set in production");
  }

  if (!config?.psql?.url?.includes("postgresql://")) {
    errors.push("DATABASE_URL must be a valid PostgreSQL connection string");
  }

  if (config.app.env === "production" && errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join("\n")}`);
  }

  if (errors.length > 0) {
    console.warn("⚠️  Configuration warnings:", errors);
  }
};
