import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { JoinMeeting } from './pages/JoinMeeting';
import { PreJoin } from './pages/PreJoin';
import { Meeting } from './pages/Meeting';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { MyMeetings } from './pages/MyMeetings';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MeetingProvider } from './context/MeetingContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <MeetingProvider>
            <Router>
              <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-300">
                <Navbar />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    
                    {/* Protected Authenticated Routes */}
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/my-meetings"
                      element={
                        <ProtectedRoute>
                          <MyMeetings />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute>
                          <Settings />
                        </ProtectedRoute>
                      }
                    />

                    {/* Public Meeting Join Routes */}
                    <Route path="/join" element={<JoinMeeting />} />
                    <Route path="/prejoin/:roomId" element={<PreJoin />} />
                    <Route path="/prejoin" element={<PreJoin />} />
                    <Route path="/meeting/:roomId" element={<Meeting />} />
                  </Routes>
                </main>
              </div>
            </Router>
          </MeetingProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
