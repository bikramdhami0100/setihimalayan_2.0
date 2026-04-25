import io from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';
import { getAccessToken } from '../utils/storage';

let socket = null;
let callbacks = {
  setSocketConnected: () => {},
  addLockedSeat: () => {},
  removeLockedSeat: () => {}
};

export const setSocketCallbacks = (cb) => {
  callbacks = { ...callbacks, ...cb };
};

export const connectSocket = async () => {
  if (socket?.connected) return socket;
  const token = await getAccessToken();
  if (!token) return null;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
    callbacks.setSocketConnected(true);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    callbacks.setSocketConnected(false);
  });

  socket.on('connect_error', (error) => {
    console.log('Socket connection error:', error);
    callbacks.setSocketConnected(false);
  });

  socket.on('seats-locked', (data) => {
    const { scheduleId, seats, expires_at } = data;
    seats.forEach(seat => callbacks.addLockedSeat(seat));
    
    // Auto-remove after expiry (client-side safety)
    const expiry = new Date(expires_at).getTime();
    const now = Date.now();
    const delay = expiry - now;
    if (delay > 0) {
      setTimeout(() => {
        seats.forEach(seat => callbacks.removeLockedSeat(seat));
      }, delay);
    }
  });

  socket.on('seats-booked', (data) => {
    const { scheduleId, seats } = data;
    seats.forEach(seat => callbacks.removeLockedSeat(seat));
  });

  socket.on('seats-released', (data) => {
    const { scheduleId, seats } = data;
    seats.forEach(seat => callbacks.removeLockedSeat(seat));
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinScheduleRoom = (scheduleId) => {
  if (socket?.connected) {
    socket.emit('join-schedule', scheduleId);
  }
};

export const leaveScheduleRoom = (scheduleId) => {
  if (socket?.connected) {
    socket.emit('leave-schedule', scheduleId);
  }
};

export const getSocket = () => socket;