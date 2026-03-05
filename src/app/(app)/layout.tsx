export const dynamic = "force-dynamic";

import { WalletProvider } from "@/providers/WalletProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { Sidebar } from "@/components/nav/Sidebar";
import { BottomNav } from "@/components/nav/BottomNav";
import { FAB } from "@/components/ui/FAB";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <AuthProvider>
        <div className="flex h-screen">
          {/* Desktop sidebar */}
          <Sidebar />

          {/* Main content */}
          <main className="relative flex-1 overflow-y-auto pb-20 md:pb-0">
            {children}
          </main>

          {/* Mobile bottom nav + FAB */}
          <BottomNav />
          <FAB />
        </div>
      </AuthProvider>
    </WalletProvider>
  );
}
