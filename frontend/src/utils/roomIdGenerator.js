/**
 * Generates a clean, readable random room code
 */
export const generateRoomId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) result += '-';
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
