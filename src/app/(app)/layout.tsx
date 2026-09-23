import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <main className="px-5 py-7 lg:ml-[228px] lg:px-10">{children}</main>
    </>
  );
}
