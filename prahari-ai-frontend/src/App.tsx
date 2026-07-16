import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import DashboardLayout from "./layouts/DashboardLayout";
import PrahariBot from "./pages/PrahariBot";
import KpiDashboard from "./pages/KpiDashboard";
import CrimeMap from "./pages/CrimeMap";
import LiveIncidents from "./pages/LiveIncidents";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import { ThemeProvider } from "./components/theme-provider";
import { DashboardProvider } from "./context/DashboardContext";
import { AppProvider } from "./context/AppContext";
import PageTransition from "./components/PageTransition";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminPanel from "./pages/AdminPanel";

// Inner component to use useLocation inside BrowserRouter
function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Login — no layout shell */}
        <Route path="/login" element={<Login />} />

        {/* Default route redirects to dashboard if authenticated, otherwise ProtectedRoute redirects to login */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Prahari AI Bot */}
        <Route path="/bot" element={
          <ProtectedRoute>
            <DashboardLayout>
              <PageTransition><PrahariBot /></PageTransition>
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* KPI Dashboard */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardLayout>
              <PageTransition><KpiDashboard /></PageTransition>
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Crime Map */}
        <Route path="/map" element={
          <ProtectedRoute>
            <DashboardLayout>
              <PageTransition><CrimeMap /></PageTransition>
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Live Incidents */}
        <Route path="/incidents" element={
          <ProtectedRoute>
            <DashboardLayout>
              <PageTransition><LiveIncidents /></PageTransition>
            </DashboardLayout>
          </ProtectedRoute>
        } />


        {/* Analytics */}
        <Route path="/analytics" element={
          <ProtectedRoute>
            <DashboardLayout>
              <PageTransition><Analytics /></PageTransition>
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Reports */}
        <Route path="/reports" element={
          <ProtectedRoute>
            <DashboardLayout>
              <PageTransition><Reports /></PageTransition>
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Settings */}
        <Route path="/settings" element={
          <ProtectedRoute>
            <DashboardLayout>
              <PageTransition><Settings /></PageTransition>
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        {/* Admin Panel */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <DashboardLayout>
              <PageTransition><AdminPanel /></PageTransition>
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="prahari-theme">
      <AppProvider>
        <DashboardProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </DashboardProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;