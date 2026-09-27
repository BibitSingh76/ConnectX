import React, { createContext, useContext, useState } from 'react';

const MeetingContext = createContext();

export const MeetingProvider = ({ children }) => {
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  return (
    <MeetingContext.Provider
      value={{
        roomId,
        setRoomId,
        userName,
        setUserName,
        isMicOn,
        setIsMicOn,
        isCamOn,
        setIsCamOn,
      }}
    >
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
