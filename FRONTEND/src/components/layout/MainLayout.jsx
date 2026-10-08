import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import LeftSidebar from "@/components/layout/LeftSidebar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";

const MainLayout = ({ children }) => {
  const { pathname } = useLocation();
  const isChatPage = pathname === "/chat";

  return (
    <div className="relative min-h-screen w-full">
      {/* Desktop dock */}
      <LeftSidebar />

      {/* Main content — tight left offset, no wasted gap */}
      <main
        className={`md:pl-[264px] transition-[padding] duration-300 ${
          isChatPage
            ? "h-[calc(100dvh-6rem)] min-h-0 overflow-hidden pb-0 md:h-dvh"
            : "min-h-screen pb-24 md:pb-3"
        }`}
      >
        {children || <Outlet />}
      </main>

      {/* Mobile dock */}
      <MobileBottomNav />
    </div>
  );
};

export default MainLayout;
