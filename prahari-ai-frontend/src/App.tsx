import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import DashboardLayout from "./layouts/DashboardLayout";
import PrahariBot from "./pages/PrahariBot";
import KpiDashboard from "./pages/KpiDashboard";
import CrimeMap from "./pages/CrimeMap";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import { ThemeProvider } from "./components/theme-provider";
import { DashboardProvider } from "./context/DashboardContext";
import PageTransition from "./components/PageTransition";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminPanel from "./pages/AdminPanel";
import { TourProvider } from "./context/TourContext";
import TourOverlay from "./components/TourOverlay";

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Login — no layout shell */}
        <Route path="/login" element={<Login />} />

        {/* Default route redirects to dashboard if authenticated */}
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
      <DashboardProvider>
        <BrowserRouter>
          <TourProvider>
            <AppRoutes />
            <TourOverlay />
          </TourProvider>
        </BrowserRouter>
      </DashboardProvider>
    </ThemeProvider>
  );
}

export default App;
