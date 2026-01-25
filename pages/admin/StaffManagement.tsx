
import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { StaffMember } from '../../types';
import { EditIcon, TrashIcon, PlusIcon } from '../../components/Icons';

const StaffManagement: React.FC = () => {
    const { staff, addStaff, updateStaff, deleteStaff } = useAdmin();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<Partial<StaffMember> | null>(null);

    const openModal = (staffMember?: StaffMember) => {
        setEditingStaff(staffMember || { name: '', role: '', imageUrl: '' });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingStaff(null);
    };

    const handleSave = async () => {
        if (!editingStaff) return;

        if (editingStaff.id) {
            await updateStaff(editingStaff as StaffMember);
        } else {
            await addStaff(editingStaff as Omit<StaffMember, 'id'>);
        }
        closeModal();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditingStaff(prev => prev ? { ...prev, [name]: value } : null);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditingStaff(prev => prev ? { ...prev, imageUrl: reader.result as string } : null);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const inputClasses = "w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white";

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Staff Management</h1>
                <button onClick={() => openModal()} className="bg-sky-500 text-white font-bold py-2 px-4 rounded-lg flex items-center hover:bg-sky-600">
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Add Staff Member
                </button>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-900">
                        <tr>
                            <th className="p-4">Name</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {staff.map(member => (
                            <tr key={member.id} className="border-t border-slate-700">
                                <td className="p-4 flex items-center">
                                    <img src={member.imageUrl} alt={member.name} className="w-12 h-12 object-cover rounded-full mr-4" />
                                    {member.name}
                                </td>
                                <td className="p-4">{member.role}</td>
                                <td className="p-4">
                                    <button onClick={() => openModal(member)} className="text-gray-400 hover:text-sky-400 mr-4"><EditIcon className="w-5 h-5" /></button>
                                    <button onClick={() => deleteStaff(member.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && editingStaff && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
                    <div className="bg-slate-800 rounded-lg shadow-2xl p-8 w-full max-w-lg border border-slate-700">
                        <h2 className="text-2xl font-bold text-white mb-6">{editingStaff.id ? 'Edit' : 'Add'} Staff Member</h2>
                        <div className="space-y-4">
                            <input type="text" name="name" value={editingStaff.name} onChange={handleChange} placeholder="Full Name" className={inputClasses} />
                            <input type="text" name="role" value={editingStaff.role} onChange={handleChange} placeholder="Role" className={inputClasses} />
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Profile Image</label>
                                <div className="mt-2 flex items-center gap-4">
                                    <img src={editingStaff.imageUrl} alt="Staff preview" className="w-24 h-24 object-cover rounded-full bg-slate-700" />
                                    <label className="cursor-pointer bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg">
                                        <span>Upload Image</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end space-x-4">
                            <button onClick={closeModal} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700">Cancel</button>
                            <button onClick={handleSave} className="bg-sky-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-600">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffManagement;
