const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getHeaders = (token) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  const authToken = token || localStorage.getItem('connectx_token');
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
};

export const checkHealth = async () => {
  const response = await fetch(`${API_URL}/health`);
  if (!response.ok) {
    throw new Error('Health check failed');
  }
  return response.json();
};

export const registerUser = async ({ name, email, password }) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Registration failed');
  }
  return data;
};

export const loginUser = async ({ email, password }) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Login failed');
  }
  return data;
};

export const getMe = async (token) => {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: 'GET',
    headers: getHeaders(token),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Token verification failed');
  }
  return data;
};
