/**
 * A utility class providing various validation helper methods.
 */
class ValidationHelper {
  /**
   * Checks if the given value is `undefined`.
   * @param value - The value to be checked.
   * @returns `true` if the value is `undefined`; otherwise `false`.
   */
  static isUndefined(value: any): boolean {
    return typeof value === 'undefined';
  }

  /**
   * Checks if the given value is a string.
   * @param value - The value to be checked.
   * @returns `true` if the value is a string; otherwise `false`.
   */
  static isString(value: any): value is string {
    return typeof value === 'string';
  }

  /**
   * Checks if the given value is a number.
   * @param value - The value to be checked.
   * @returns `true` if the value is a number; otherwise `false`.
   */
  static isNumber(value: any): value is number {
    return typeof value === 'number';
  }

  /**
   * Checks if the given value is either `null` or `undefined`.
   * @param value - The value to be checked.
   * @returns `true` if the value is `null` or `undefined`; otherwise `false`.
   */
  static isNullOrUndefined(value: any): boolean {
    return value === null || typeof value === 'undefined';
  }

  /**
   * Checks if the given value is `null`.
   * @param value - The value to be checked.
   * @returns `true` if the value is `null`; otherwise `false`.
   */
  static isNull(value: any): boolean {
    return value == null;
  }

  /**
   * Checks if the given value is an array.
   * @param value - The value to be checked.
   * @returns `true` if the value is an array; otherwise `false`.
   */
  static isArray(value: any): value is any[] {
    return Array.isArray(value);
  }

  /**
   * Checks if the given value is an empty array.
   * @param value - The value to be checked.
   * @returns `true` if the value is an empty array; otherwise `false`.
   */
  static isEmptyArray(value: any): boolean {
    return Array.isArray(value) && value.length === 0;
  }

  /**
   * Checks if the given value is empty.
   * This considers `null`, `undefined`, an empty string, or an empty array as empty.
   * @param value - The value to be checked.
   * @returns `true` if the value is empty; otherwise `false`.
   */
  static isEmpty(value: any): boolean {
    return (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.length === 0) ||
      (Array.isArray(value) && value.length === 0)
    );
  }

  /**
   * Checks if the given value is a valid email address.
   * @param value - The value to be checked.
   * @returns `true` if the value is a valid email address; otherwise `false`.
   */
  static isEmail(value: any): boolean {
    if (!ValidationHelper.isString(value)) return false;
    const emailRegex = /\S+@\S+\.\S+/;
    return emailRegex.test(value);
  }

  /**
   * Checks if the given value represents a valid date.
   * @param value - The value to be checked.
   * @returns `true` if the value represents a valid date; otherwise `false`.
   */
  static isDate(value: any): boolean {
    if (!ValidationHelper.isString(value)) return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  /**
   * Checks if the given value is a valid URL.
   * @param value - The value to be checked.
   * @returns `true` if the value is a valid URL; otherwise `false`.
   */
  static isURL(value: any): boolean {
    if (!ValidationHelper.isString(value)) return false;
    const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;
    return urlRegex.test(value);
  }

  /**
   * Checks if the given value is a valid IP address (IPv4 or IPv6).
   * @param value - The value to be checked.
   * @returns `true` if the value is a valid IP address; otherwise `false`.
   */
  static isIPAddress(value: any): boolean {
    if (!ValidationHelper.isString(value)) return false;
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/i;
    return ipv4Regex.test(value) || ipv6Regex.test(value);
  }

  /**
   * Checks if the given filename has a valid file extension.
   * @param filename - The filename to be checked.
   * @param extensions - An array of valid file extensions.
   * @returns `true` if the file extension is valid; otherwise `false`.
   */
  static isValidFileExtension(filename: string, extensions: string[]): boolean {
    const extension = filename.split('.').pop()?.toLowerCase() ?? '';
    return extensions.includes(extension);
  }

  /**
   * Checks if the given password matches the confirmation password.
   * @param password - The password to be checked.
   * @param confirmPassword - The confirmation password to be checked.
   * @returns `true` if the password matches the confirmation password; otherwise `false`.
   */
  static isPasswordConfirmed(password: string, confirmPassword: string): boolean {
    return password === confirmPassword;
  }

  /**
   * Checks if the given string is a valid JSON.
   * @param jsonString - The string to be checked.
   * @returns `true` if the string is valid JSON; otherwise `false`.
   */
  static isValidJSON(jsonString: string): boolean {
    try {
      JSON.parse(jsonString);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks if the given value is an object.
   * @param value - The value to be checked.
   * @returns `true` if the value is an object and not `null`; otherwise `false`.
   */
  static isObject(value: any): value is Record<string, any> {
    return typeof value === 'object' && value !== null;
  }

  /**
   * Checks if the given object is empty.
   * @param obj - The object to be checked.
   * @returns `true` if the object has no own enumerable properties; otherwise `false`.
   */
  static isEmptyObject(obj: any): boolean {
    if (!ValidationHelper.isObject(obj)) return false;
    return Object.keys(obj).length === 0;
  }
}

export default ValidationHelper;
