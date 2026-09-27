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

export const createMeetingApi = async ({ meetingId, title, hostName }) => {
  const response = await fetch(`${API_URL}/meetings`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ meetingId, title, hostName }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to create meeting');
  }
  return data;
};

export const getMeetingApi = async (meetingId) => {
  const response = await fetch(`${API_URL}/meetings/${meetingId}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Meeting not found');
  }
  return data;
};

export const joinMeetingApi = async (meetingId, { displayName } = {}) => {
  const response = await fetch(`${API_URL}/meetings/${meetingId}/join`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ displayName }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to join meeting');
  }
  return data;
};

export const leaveMeetingApi = async (meetingId, { displayName } = {}) => {
  const response = await fetch(`${API_URL}/meetings/${meetingId}/leave`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ displayName }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to leave meeting');
  }
  return data;
};

export const endMeetingApi = async (meetingId) => {
  const response = await fetch(`${API_URL}/meetings/${meetingId}/end`, {
    method: 'PATCH',
    headers: getHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to end meeting');
  }
  return data;
};
