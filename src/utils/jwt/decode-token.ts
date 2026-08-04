import jwt, { JwtPayload } from 'jsonwebtoken';
import config from '../../config/config';

/**
 * Verifies a JWT token using a secret key.
 *
 * @param token - The JWT token to verify.
 * @returns {JwtPayload | string | null} - The decoded token payload if valid, null if verification fails.
 */
const DecodeToken = async (token: string): Promise<JwtPayload | string | null> => {
  try {
    const KEY: string = config.JWT_SECRET;
    return jwt.verify(token, KEY);
  } catch (error) {
    return null;
  }
};

export default DecodeToken;
