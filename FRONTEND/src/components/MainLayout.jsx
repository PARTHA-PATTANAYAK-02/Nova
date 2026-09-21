import React from "react";
import { Outlet } from "react-router-dom";
import LeftSidebar from "./LeftSidebar";
import MobileBottomNav from "./MobileBottomNav";

const MainLayout = () => {
  return (
    <div className="relative min-h-screen w-full">
      {/* Floating desktop dock */}
      <LeftSidebar />

      {/* Main content — offset for desktop dock, padded for mobile dock */}
      <main className="md:pl-[112px] min-h-screen pb-28 md:pb-6 transition-[padding] duration-500">
        <Outlet />
      </main>

      {/* Floating mobile dock */}
      <MobileBottomNav />
    </div>
  );
};

export default MainLayout;
