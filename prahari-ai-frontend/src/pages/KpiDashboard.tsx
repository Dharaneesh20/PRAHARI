import KpiMap from "../components/dashboard/KpiMap";

export default function KpiDashboard() {
  return (
    <div className="w-full h-full flex flex-col overflow-y-auto scrollbar-hide">
      <KpiMap />
    </div>
  );
}