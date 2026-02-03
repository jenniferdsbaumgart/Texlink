import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminHeader } from './AdminHeader';
import { DashboardFooter } from '../dashboard/DashboardFooter';

export const AdminLayout: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300 flex flex-col">
            <AdminHeader />

            <main className="flex-1">
                <Outlet />
            </main>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <DashboardFooter variant="admin" />
            </div>
        </div>
    );
};

export default AdminLayout;
