import bcrypt from 'bcryptjs';
import config from '../../config/config';

/**
 * Hashes the given data using bcrypt.
 *
 * @param {string} data - The data to be hashed.
 * @returns {Promise<string>} - A promise that resolves to the hashed data.
 */
const HashInfo = async (data: string) => {
  // Hash the data using bcrypt with a salt rounds value
  return await bcrypt.hash(data, config.SALT_ROUNDS);
};

export default HashInfo;
