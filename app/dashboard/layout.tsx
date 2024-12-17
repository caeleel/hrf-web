import { DashboardNavigation } from '../components/DashboardNavigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen h-screen overflow-hidden">
      <DashboardNavigation />
      <main className="flex-grow overflow-y-auto z-0">
        {children}
      </main>
    </div>
  );
} 