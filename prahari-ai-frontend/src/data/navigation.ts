import {
    LayoutDashboard,
    MapPinned,
    Bot,
    Shield,
    BarChart3,
    FileText
} from "lucide-react";

export const navigation = [
    { name: "PRAHARI AI BOT", labelKey: "navBot", icon: Bot, path: "/bot", level: 1 },
    { name: "KPI Dashboard", labelKey: "navDashboard", icon: LayoutDashboard, path: "/dashboard", level: 1 },
    { name: "Crime Map", labelKey: "navCrimeMap", icon: MapPinned, path: "/map", level: 1 },
    { name: "Analytics", labelKey: "navAnalytics", icon: BarChart3, path: "/analytics", level: 2 },
    { name: "Reports", labelKey: "navReports", icon: FileText, path: "/reports", level: 1 },
    { name: "Admin Panel", labelKey: "navAdmin", icon: Shield, path: "/admin", level: 3 }
];
