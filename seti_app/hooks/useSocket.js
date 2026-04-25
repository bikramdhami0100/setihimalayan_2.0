import { useEffect, useRef, useContext } from 'react';
import { connectSocket, disconnectSocket, joinScheduleRoom, leaveScheduleRoom, getSocket, setSocketCallbacks } from '../services/socketService';
import { UIContext } from '../context/UIContext';
import { AuthContext } from '../context/AuthContext';
import { BookingContext } from '../context/BookingContext';

export const useSocket = (scheduleId = null) => {
  const { isAuthenticated } = useContext(AuthContext);
  const { setSocketConnected } = useContext(UIContext);
  const { addLockedSeat, removeLockedSeat } = useContext(BookingContext);
  const joinedRef = useRef(false);

  useEffect(() => {
    // Register callbacks from context
    setSocketCallbacks({
      setSocketConnected,
      addLockedSeat,
      removeLockedSeat
    });
  }, [setSocketConnected, addLockedSeat, removeLockedSeat]);

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