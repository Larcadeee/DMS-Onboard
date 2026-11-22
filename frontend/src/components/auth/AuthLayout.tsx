import type { ReactNode } from "react";
import CustomerServiceImage from "./CustomerServiceImage";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        <aside className="hidden items-center justify-center px-10 lg:flex xl:px-14">
          <CustomerServiceImage />
        </aside>

        <section className="flex items-center justify-center px-5 py-12 sm:px-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </section>
      </div>
    </main>
  );
}
