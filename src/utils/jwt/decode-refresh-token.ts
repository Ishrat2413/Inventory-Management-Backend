import jwt, { JwtPayload } from 'jsonwebtoken';
import config from '../../config/config';

/**
 * Verifies a refresh JWT using the dedicated refresh-token secret.
 *
 * @param token - The refresh token to verify.
 * @returns {Promise<JwtPayload | string | null>} - The decoded payload, or null if invalid/expired.
 */
const DecodeRefreshToken = async (token: string): Promise<JwtPayload | string | null> => {
  try {
    return jwt.verify(token, config.REFRESH_TOKEN_SECRET);
  } catch (error) {
    return null;
  }
};

export default DecodeRefreshToken;
