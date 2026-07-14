import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import DashboardLayout from "./layouts/DashboardLayout";
import PrahariBot from "./pages/PrahariBot";
import KpiDashboard from "./pages/KpiDashboard";
import CrimeMap from "./pages/CrimeMap";
import LiveIncidents from "./pages/LiveIncidents";
import PatrolUnits from "./pages/PatrolUnits";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import { ThemeProvider } from "./components/theme-provider";
import { DashboardProvider } from "./context/DashboardContext";
import { AppProvider } from "./context/AppContext";
import PageTransition from "./components/PageTransition";

// Inner component to use useLocation inside BrowserRouter
function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Login — no layout shell */}
        <Route path="/login" element={<Login />} />

        {/* Prahari AI Bot */}
        <Route path="/" element={
          <DashboardLayout>
            <PageTransition><PrahariBot /></PageTransition>
          </DashboardLayout>
        } />

        {/* KPI Dashboard */}
        <Route path="/dashboard" element={
          <DashboardLayout>
            <PageTransition><KpiDashboard /></PageTransition>
          </DashboardLayout>
        } />

        {/* Crime Map */}
        <Route path="/map" element={
          <DashboardLayout>
            <PageTransition><CrimeMap /></PageTransition>
          </DashboardLayout>
        } />

        {/* Live Incidents */}
        <Route path="/incidents" element={
          <DashboardLayout>
            <PageTransition><LiveIncidents /></PageTransition>
          </DashboardLayout>
        } />

        {/* Patrol Units */}
        <Route path="/patrol" element={
          <DashboardLayout>
            <PageTransition><PatrolUnits /></PageTransition>
          </DashboardLayout>
        } />

        {/* Analytics */}
        <Route path="/analytics" element={
          <DashboardLayout>
            <PageTransition><Analytics /></PageTransition>
          </DashboardLayout>
        } />

        {/* Reports */}
        <Route path="/reports" element={
          <DashboardLayout>
            <PageTransition><Reports /></PageTransition>
          </DashboardLayout>
        } />

        {/* Settings */}
        <Route path="/settings" element={
          <DashboardLayout>
            <PageTransition><Settings /></PageTransition>
          </DashboardLayout>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
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