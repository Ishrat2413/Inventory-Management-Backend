import dotenv from 'dotenv';

dotenv.config();

interface Config {
  BASE_URL: string;
  PORT: number;
  DATABASE_URL: string;
  NODE_ENV: string;
  SALT_ROUNDS: number;
  JWT_SECRET: string;
  JWT_EXPIRATION_TIME: number;
  REFRESH_TOKEN_SECRET: string;
  REFRESH_TOKEN_EXPIRATION_TIME: number;
  EMAIL_HOST: string;
  EMAIL_PORT: number;
  EMAIL_USER: string;
  EMAIL_PASSWORD: string;
  EMAIL_FROM: string;
  MAX_JSON_SIZE: string;
  MAX_FILE_SIZE: number;
  URL_ENCODED: boolean;
  REQUEST_LIMIT_TIME: number;
  REQUEST_LIMIT_NUMBER: number;
  WEB_CACHE: boolean;
  EXPRESS_FILE_UPLOAD_CONFIG: object;
}

const config: Config = {
  BASE_URL: process.env.BASE_URL as string,
  PORT: parseInt(process.env.PORT as string, 10),
  DATABASE_URL: process.env.DATABASE_URL as string,
  NODE_ENV: process.env.NODE_ENV as string,
  SALT_ROUNDS: parseInt(process.env.SALT_ROUNDS as string, 10),
  JWT_SECRET: process.env.JWT_SECRET as string,
  JWT_EXPIRATION_TIME: parseInt(process.env.JWT_EXPIRATION_TIME as string, 10),
  REFRESH_TOKEN_SECRET: (process.env.REFRESH_TOKEN_SECRET as string) || `${process.env.JWT_SECRET}_refresh`,
  REFRESH_TOKEN_EXPIRATION_TIME: parseInt(
    (process.env.REFRESH_TOKEN_EXPIRATION_TIME as string) || `${60 * 60 * 24 * 30}`,
    10
  ),
  EMAIL_HOST: (process.env.EMAIL_HOST || process.env.SMTP_HOST) as string,
  EMAIL_PORT: parseInt((process.env.EMAIL_PORT || process.env.SMTP_PORT || '587') as string, 10),
  EMAIL_USER: (process.env.EMAIL_USER || process.env.SMTP_USER) as string,
  EMAIL_PASSWORD: (process.env.EMAIL_PASSWORD || process.env.SMTP_PASS) as string,
  EMAIL_FROM: (process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.EMAIL_USER || process.env.SMTP_USER) as string,
  MAX_JSON_SIZE: process.env.MAX_JSON_SIZE as string,
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE as string, 10),
  URL_ENCODED: process.env.URL_ENCODED === 'true' ? true : false,
  REQUEST_LIMIT_TIME: parseInt(process.env.REQUEST_LIMIT_TIME as string, 10),
  REQUEST_LIMIT_NUMBER: parseInt(process.env.REQUEST_LIMIT_NUMBER as string, 10),
  WEB_CACHE: process.env.WEB_CACHE === 'true' ? true : false,
  EXPRESS_FILE_UPLOAD_CONFIG: {
    createParentPath: true,
    preserveExtension: true,
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE as string, 10),
    },
  },
};

export default config;
