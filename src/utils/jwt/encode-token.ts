import jwt from 'jsonwebtoken';
import config from '../../config/config';

/**
 * Generates a JWT token for a user based on their email and user ID.
 *
 * @param email - The user's email.
 * @param userId - The user's unique ID.
 * @returns {Promise<string>} - A promise that resolves to the signed JWT token.
 */
const EncodeToken = async (email: string, userId: string, role: string): Promise<string> => {
  const KEY: string = config.JWT_SECRET;
  const EXPIRE: jwt.SignOptions = { expiresIn: config.JWT_EXPIRATION_TIME };
  const PAYLOAD = { email, id: userId, role };

  return jwt.sign(PAYLOAD, KEY, EXPIRE);
};

export default EncodeToken;
