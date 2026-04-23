import { useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket, joinScheduleRoom, leaveScheduleRoom, getSocket } from '../services/socketService';
import useUIStore from '../store/uiStore';
import useAuthStore from '../store/authStore';

export const useSocket = (scheduleId = null) => {
  const { isAuthenticated } = useAuthStore();
  const { setSocketConnected } = useUIStore();
  const joinedRef = useRef(false);

  useEffect(() => {
    let socket;
    const initSocket = async () => {
      if (isAuthenticated) {
        socket = await connectSocket();
        if (socket?.connected) {
          setSocketConnected(true);
          if (scheduleId && !joinedRef.current) {
            joinScheduleRoom(scheduleId);
            joinedRef.current = true;
          }
        }
      }
    };
    initSocket();

    return () => {
      if (scheduleId && joinedRef.current) {
        leaveScheduleRoom(scheduleId);
        joinedRef.current = false;
      }
    };
  }, [isAuthenticated, scheduleId]);

  const joinRoom = (id) => {
    if (id && !joinedRef.current) {
      joinScheduleRoom(id);
      joinedRef.current = true;
    }
  };

  const leaveRoom = (id) => {
    if (id && joinedRef.current) {
      leaveScheduleRoom(id);
      joinedRef.current = false;
    }
  };

  return {
    joinRoom,
    leaveRoom,
    socket: getSocket(),
  };
};