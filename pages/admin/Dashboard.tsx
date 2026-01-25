
import React from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { ProductIcon, GalleryIcon, UsersIcon, MessageSquareIcon } from '../../components/Icons';

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode; link: string }> = ({ title, value, icon, link }) => (
    <Link to={link} className="bg-slate-800 p-6 rounded-lg border border-slate-700 hover:border-sky-500 transition-colors flex items-center">
        <div className="p-3 rounded-full bg-slate-700 mr-4">{icon}</div>
        <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </Link>
);

const Dashboard: React.FC = () => {
    const { products, galleries, staff, reviews } = useAdmin();

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-8">Admin Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Products" value={products.length} icon={<ProductIcon className="w-6 h-6 text-sky-400" />} link="/admin/products" />
                <StatCard title="Galleries" value={galleries.length} icon={<GalleryIcon className="w-6 h-6 text-sky-400" />} link="/admin/gallery" />
                <StatCard title="Staff Members" value={staff.length} icon={<UsersIcon className="w-6 h-6 text-sky-400" />} link="/admin/staff" />
                <StatCard title="Customer Reviews" value={reviews.length} icon={<MessageSquareIcon className="w-6 h-6 text-sky-400" />} link="/admin/reviews" />
            </div>
            <div className="mt-12 bg-slate-800 p-6 rounded-lg border border-slate-700">
                <h2 className="text-xl font-semibold text-white mb-4">Welcome to the Admin Panel</h2>
                <p className="text-gray-400">
                    From here, you can manage your store's products, update the design gallery, and edit content across the site. Use the navigation on the left to get started.
                </p>
            </div>
        </div>
    );
};

export default Dashboard;
