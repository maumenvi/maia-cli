



/** Performs the get env operation. */
export const getEnv = (key: string, fallback = ''): string => {
  const value = process.env[key];
  return typeof value === 'string' ? value.trim() : fallback;
};
