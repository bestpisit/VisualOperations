'use client';

import { signOut } from "next-auth/react";
import { useState } from "react";
import Image from 'next/image';
import axios from "axios";
import { Session } from "next-auth";

const ProfilePage = ({ user }: { user: Session['user'] }) => {
    const [name, setName] = useState(user.name || "");
    const [masterPassword, setMasterPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors, setErrors] = useState<{ email?: string, name?: string, masterPassword?: string, newPassword?: string, confirmPassword?: string }>({});
    const [successMessage, setSuccessMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handlePasswordChange = async () => {
        const newErrors: { newPassword?: string; confirmPassword?: string } = {};

        if (!newPassword) {
            newErrors.newPassword = "New password is required.";
        }

        if (newPassword !== confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match.";
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) return;

        try {
            setLoading(true);
            const response = await axios.post("/api/auth/me/changepassword", {
                currentPassword: masterPassword,
                newPassword
            });

            if (response.status === 200) {
                setSuccessMessage("Password updated successfully!");
                setMasterPassword("");
                setNewPassword("");
                setConfirmPassword("");
                await signOut();
            }
        } catch (error: any) {
            setErrors({
                masterPassword: error.response?.data?.error || "Something went wrong while updating the password.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-8 bg-white rounded-lg shadow-md max-w-xl">
            <h1 className="text-4xl font-bold text-gray-800 mb-6">My Account</h1>

            <div className="flex items-center mb-6">
                <Image src={user.image || "/"} alt="Profile Picture" width={60} height={60} className="rounded-full shadow" />
                <input
                    className="border p-3 rounded-lg ml-4 w-full bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                    disabled
                />
            </div>

            <div className="mb-6">
                <label className="block text-gray-700 font-semibold">Email</label>
                <input
                    className="border p-3 rounded-lg w-full bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={user.email || ''}
                    placeholder="Email"
                    disabled
                />
            </div>

            <hr className="my-8" />

            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Change Password</h2>

            <div className="mb-6">
                <label className="block text-gray-700 font-semibold">Current Password</label>
                <input
                    type="password"
                    className="border p-3 rounded-lg w-full bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="Current password"
                />
                {errors.masterPassword && <span className="text-red-500 text-sm">{errors.masterPassword}</span>}
            </div>

            <div className="mb-6">
                <label className="block text-gray-700 font-semibold">New Password</label>
                <input
                    type="password"
                    className="border p-3 rounded-lg w-full bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                />
                {errors.newPassword && <span className="text-red-500 text-sm">{errors.newPassword}</span>}
            </div>

            <div className="mb-6">
                <label className="block text-gray-700 font-semibold">Confirm New Password</label>
                <input
                    type="password"
                    className="border p-3 rounded-lg w-full bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                />
                {errors.confirmPassword && <span className="text-red-500 text-sm">{errors.confirmPassword}</span>}
            </div>

            <button
                onClick={handlePasswordChange}
                className="bg-green-500 text-white py-2 px-4 rounded-lg w-full shadow hover:bg-green-400 transition duration-300 ease-in-out"
                disabled={loading}
            >
                {loading ? "Updating..." : "Update Password"}
            </button>

            {successMessage && <p className="text-green-500 text-sm mt-4">{successMessage}</p>}

            <hr className="my-8" />
        </div>
    );
}

export default ProfilePage