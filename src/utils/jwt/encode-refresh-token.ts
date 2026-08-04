import jwt from 'jsonwebtoken';
import config from '../../config/config';

/**
 * Generates a long-lived refresh JWT for a user. Signed with a distinct
 * secret from the access token so a leaked access token cannot be replayed
 * as a refresh token.
 *
 * @param userId - The user's unique ID.
 * @returns {Promise<string>} - The signed refresh JWT.
 */
const EncodeRefreshToken = async (userId: string): Promise<string> => {
  const KEY: string = config.REFRESH_TOKEN_SECRET;
  const EXPIRE: jwt.SignOptions = { expiresIn: config.REFRESH_TOKEN_EXPIRATION_TIME };
  return jwt.sign({ id: userId, type: 'refresh' }, KEY, EXPIRE);
};

export default EncodeRefreshToken;
