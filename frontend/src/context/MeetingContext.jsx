import React, { createContext, useContext, useState, useMemo } from 'react';

const MeetingContext = createContext();

export const MeetingProvider = ({ children }) => {
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  const value = useMemo(
    () => ({
      roomId,
      setRoomId,
      userName,
      setUserName,
      isMicOn,
      setIsMicOn,
      isCamOn,
      setIsCamOn,
    }),
    [roomId, userName, isMicOn, isCamOn]
  );

  return (
    <MeetingContext.Provider value={value}>
      {children}
    </MeetingContext.Provider>
  );
};

export const useMeeting = () => {
  const context = useContext(MeetingContext);
  if (!context) {
    throw new Error('useMeeting must be used within a MeetingProvider');
  }
  return context;
};
