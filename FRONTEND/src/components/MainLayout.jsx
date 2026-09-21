import React from "react";
import { Outlet } from "react-router-dom";
import LeftSidebar from "./LeftSidebar";
import MobileBottomNav from "./MobileBottomNav";

const MainLayout = () => {
  return (
    <div className="relative min-h-screen w-full">
      {/* Desktop dock */}
      <LeftSidebar />

      {/* Main content — tight left offset, no wasted gap */}
      <main className="md:pl-[80px] min-h-screen pb-24 md:pb-3 transition-[padding] duration-300">
        <Outlet />
      </main>

      {/* Mobile dock */}
      <MobileBottomNav />
    </div>
  );
};

export default MainLayout;
