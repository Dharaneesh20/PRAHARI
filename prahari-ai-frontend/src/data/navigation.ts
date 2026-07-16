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
    { name: "PRAHARI AI BOT", icon: Bot, path: "/bot", level: 1 },
    { name: "KPI Dashboard", icon: LayoutDashboard, path: "/dashboard", level: 1 },
    { name: "Crime Map", icon: MapPinned, path: "/map", level: 1 },
    { name: "Live Incidents", icon: AlertTriangle, path: "/incidents", level: 1 },
    { name: "Analytics", icon: BarChart3, path: "/analytics", level: 2 },
    { name: "Reports", icon: FileText, path: "/reports", level: 1 },
    { name: "Settings", icon: Settings, path: "/settings", level: 1 },
    { name: "Admin Panel", icon: Shield, path: "/admin", level: 3 }
];