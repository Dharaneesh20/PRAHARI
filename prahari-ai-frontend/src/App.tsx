import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import PrahariBot from "./pages/PrahariBot";
import KpiDashboard from "./pages/KpiDashboard";
import Login from "./pages/Login"; 
import { ThemeProvider } from "./components/theme-provider";
import { DashboardProvider } from "./context/DashboardContext";

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="prahari-theme">
      <DashboardProvider>
        <BrowserRouter>
          <Routes>
            {/* The Login Page */}
            <Route path="/login" element={<Login />} />
            
            {/* Default Route: Prahari AI Bot */}
            <Route 
              path="/" 
              element={
                <DashboardLayout>
                  <PrahariBot />
                </DashboardLayout>
              } 
            />

            {/* KPI Dashboard Route */}
            <Route 
              path="/dashboard" 
              element={
                <DashboardLayout>
                  <KpiDashboard />
                </DashboardLayout>
              } 
            />

            {/* Catch-all redirects back to Bot */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </DashboardProvider>
    </ThemeProvider>
  );
}

export default App;