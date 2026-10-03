import Sidebar from '@/components/Sidebar';
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden bg-[#0f172a]">{children}</main>
    </div>
  );
}
