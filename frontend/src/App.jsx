import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MeetingProvider } from './context/MeetingContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Route-based lazy loading for secondary pages
const JoinMeeting = lazy(() => import('./pages/JoinMeeting').then((m) => ({ default: m.JoinMeeting })));
const PreJoin = lazy(() => import('./pages/PreJoin').then((m) => ({ default: m.PreJoin })));
const Meeting = lazy(() => import('./pages/Meeting').then((m) => ({ default: m.Meeting })));
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const MyMeetings = lazy(() => import('./pages/MyMeetings').then((m) => ({ default: m.MyMeetings })));
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <MeetingProvider>
            <Router>
              <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-300">
                <Navbar />
                <main className="flex-1 flex flex-col">
                  <Suspense
                    fallback={
                      <div className="flex-1 flex items-center justify-center p-12 text-indigo-400">
                        <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                      </div>
                    }
                  >
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
                  </Suspense>
                </main>
              </div>
            </Router>
          </MeetingProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
