import bcrypt from 'bcryptjs';

/**
 * Compares the given data with the hashed data.
 *
 * @param {string} data - The plain data to compare.
 * @param {string} hash - The hashed data to compare against.
 * @returns {Promise<boolean>} - A promise that resolves to a boolean indicating if the data matches the hash.
 */
const compareInfo = async (data: string, hash: string): Promise<boolean> => {
  // Compare the plain data with the hashed data using bcrypt
  return await bcrypt.compare(data, hash);
};

export default compareInfo;
