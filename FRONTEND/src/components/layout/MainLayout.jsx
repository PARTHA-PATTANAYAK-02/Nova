import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import LeftSidebar from "@/components/layout/LeftSidebar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";

const MainLayout = ({ children }) => {
  const { pathname } = useLocation();
  const isChatPage = pathname === "/chat";
  const isPostPage = pathname.startsWith("/post/");
  const isNoScrollPage = isChatPage || isPostPage;

  return (
    <div className="relative min-h-dvh w-full">
      <LeftSidebar />

      <main
        className={`
          md:pl-[268px] transition-[padding] duration-300
          ${
            isNoScrollPage
              ? "h-dvh min-h-0 overflow-hidden pb-0 md:pb-0"
              : "min-h-dvh pb-28 md:pb-4"
          }
        `}
      >
        {children || <Outlet />}
      </main>

      {!isChatPage && <MobileBottomNav />}
    </div>
  );
};

export default MainLayout;
