
import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { SidebarTrigger } from "@/components/ui/sidebar";

const AppLayout = () => {
  return (
    <div className="min-h-screen flex w-full bg-gray-50">
      <AppSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-2 md:px-4 py-2 md:py-3">
          <div className="flex items-center gap-2 md:gap-4">
            <SidebarTrigger className="lg:hidden" />
            <div className="flex-1" />
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          <div className="p-2 md:p-4 lg:p-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
