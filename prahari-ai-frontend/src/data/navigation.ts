import {
    LayoutDashboard,
    MapPinned,
    AlertTriangle,
    Bot,
    Shield,
    BarChart3,
    FileText,
    Settings
} from "lucide-react";

export const navigation = [
    { name: "PRAHARI AI BOT", icon: Bot, path: "/" },
    { name: "KPI Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { name: "Crime Map", icon: MapPinned, path: "/map" },
    { name: "Live Incidents", icon: AlertTriangle, path: "/incidents" },
    { name: "Patrol Units", icon: Shield, path: "/patrol" },
    { name: "Analytics", icon: BarChart3, path: "/analytics" },
    { name: "Reports", icon: FileText, path: "/reports" },
    { name: "Settings", icon: Settings, path: "/settings" }
];