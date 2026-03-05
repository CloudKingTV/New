export const dynamic = "force-dynamic";

import { WalletProvider } from "@/providers/WalletProvider";
import { AuthProvider } from "@/providers/AuthProvider";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WalletProvider>
      <AuthProvider>{children}</AuthProvider>
    </WalletProvider>
  );
}
