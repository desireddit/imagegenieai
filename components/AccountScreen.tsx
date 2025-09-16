/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { User } from '../App';
import { UserIcon, EmailIcon, LockIcon, HistoryIcon } from './icons';
import { auth } from '../firebase';
// FIX: Switched to Firebase v8 compat imports to resolve module errors.
// FIX: Changed Firebase v8 compat import from a default import to a namespace import (`import * as firebase from ...`). Added a side-effect import for `firebase/compat/auth` to ensure the `auth` namespace and its types/methods are correctly attached to the main `firebase` object.
// FIX: Reverted incorrect namespace import to a default import for Firebase v8 compat to resolve type errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

interface AccountScreenProps {
    user: User;
    onUpdateUser: (updatedData: Partial<User>) => void;
}

const AccountScreen: React.FC<AccountScreenProps> = ({ user, onUpdateUser }) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'billing'>('profile');

    // State for forms
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleProfileUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        if (!name || !email) {
            setMessage({ type: 'error', text: 'Name and email cannot be empty.' });
            return;
        }
        if (name === user.name && email === user.email) {
            setMessage({ type: 'error', text: 'No changes detected.' });
            return;
        }
        onUpdateUser({ name, email });
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
    };
    
    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        if (!oldPassword || !newPassword || !confirmPassword) {
            setMessage({ type: 'error', text: 'All password fields are required.' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'New password must be at least 6 characters long.' });
            return;
        }

        setIsLoading(true);
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) {
            setMessage({ type: 'error', text: 'User not authenticated.' });
            setIsLoading(false);
            return;
        }

        try {
            // FIX: Switched to Firebase v8 compat EmailAuthProvider.
            const credential = firebase.auth.EmailAuthProvider.credential(firebaseUser.email!, oldPassword);
            // FIX: Switched to Firebase v8 compat reauthenticateWithCredential method.
            await firebaseUser.reauthenticateWithCredential(credential);
            // FIX: Switched to Firebase v8 compat updatePassword method.
            await firebaseUser.updatePassword(newPassword);
            setMessage({ type: 'success', text: 'Password changed successfully!' });
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            const firebaseError = error as { code?: string, message: string };
             if (firebaseError.code === 'auth/wrong-password') {
                setMessage({ type: 'error', text: 'The old password you entered is incorrect.' });
            } else {
                setMessage({ type: 'error', text: `An error occurred: ${firebaseError.message}` });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const renderCreditHistory = () => (
        <div className="flex flex-col gap-4">
             <div className="flex items-center gap-3">
                <HistoryIcon className="w-6 h-6 text-blue-400" />
                <h3 className="text-2xl font-bold text-gray-100">Credit History</h3>
            </div>
            <div className="max-h-96 overflow-y-auto bg-gray-900/50 rounded-lg border border-gray-700">
                <ul className="divide-y divide-gray-700">
                    {user.creditHistory && user.creditHistory.length > 0 ? (
                        user.creditHistory.map((item, index) => (
                            <li key={index} className="p-4 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-gray-200">{item.reason}</p>
                                    <p className="text-xs text-gray-400">{new Date(item.date).toLocaleString()}</p>
                                </div>
                                <span className={`font-bold text-lg ${item.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {item.amount > 0 ? `+${item.amount}` : item.amount}
                                </span>
                            </li>
                        ))
                    ) : (
                        <li className="p-4 text-center text-gray-400">No credit history found.</li>
                    )}
                </ul>
            </div>
        </div>
    );
    
    const renderContent = () => {
        switch(activeTab) {
            case 'profile':
                return (
                    <form onSubmit={handleProfileUpdate} className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <UserIcon className="w-6 h-6 text-blue-400" />
                            <h3 className="text-2xl font-bold text-gray-100">Edit Profile</h3>
                        </div>
                        <div className="relative">
                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" className="w-full bg-gray-900 border border-gray-700 text-gray-200 rounded-lg py-3 pl-12 pr-4 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition" />
                        </div>
                        <div className="relative">
                            <EmailIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input type="email" value={email} disabled placeholder="Email Address" className="w-full bg-gray-900 border border-gray-700 text-gray-400 rounded-lg py-3 pl-12 pr-4 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition disabled:cursor-not-allowed" />
                        </div>
                        <button type="submit" className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-colors">Save Changes</button>
                    </form>
                );
            case 'password':
                return (
                    <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <LockIcon className="w-6 h-6 text-blue-400" />
                            <h3 className="text-2xl font-bold text-gray-100">Change Password</h3>
                        </div>
                        <div className="relative">
                            <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="Old Password" className="w-full bg-gray-900 border border-gray-700 text-gray-200 rounded-lg py-3 pl-12 pr-4 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition" />
                        </div>
                        <div className="relative">
                            <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New Password" className="w-full bg-gray-900 border border-gray-700 text-gray-200 rounded-lg py-3 pl-12 pr-4 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition" />
                        </div>
                        <div className="relative">
                            <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm New Password" className="w-full bg-gray-900 border border-gray-700 text-gray-200 rounded-lg py-3 pl-12 pr-4 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition" />
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:bg-blue-800 disabled:cursor-not-allowed">
                            {isLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                );
            case 'billing':
                return renderCreditHistory();
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-8 animate-fade-in">
            <aside className="w-full md:w-1/4">
                <div className="bg-gray-800/50 border border-gray-700/80 rounded-lg p-4 flex flex-col gap-2">
                    <button onClick={() => { setActiveTab('profile'); setMessage(null); }} className={`w-full text-left p-3 rounded-md transition-colors text-gray-300 hover:bg-white/10 ${activeTab === 'profile' ? 'bg-blue-600 text-white' : ''}`}>Profile</button>
                    <button onClick={() => { setActiveTab('password'); setMessage(null); }} className={`w-full text-left p-3 rounded-md transition-colors text-gray-300 hover:bg-white/10 ${activeTab === 'password' ? 'bg-blue-600 text-white' : ''}`}>Password</button>
                    <button onClick={() => { setActiveTab('billing'); setMessage(null); }} className={`w-full text-left p-3 rounded-md transition-colors text-gray-300 hover:bg-white/10 ${activeTab === 'billing' ? 'bg-blue-600 text-white' : ''}`}>Credit History</button>
                </div>
            </aside>
            <main className="w-full md:w-3/4">
                <div className="bg-gray-800/50 border border-gray-700/80 rounded-lg p-8 backdrop-blur-sm shadow-2xl">
                    {message && (
                        <div className={`p-4 rounded-lg mb-6 text-center ${message.type === 'success' ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`}>
                            {message.text}
                        </div>
                    )}
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default AccountScreen;
