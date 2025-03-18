"use client";

import "react-toastify/dist/ReactToastify.css";
import { Slide, ToastContainer } from 'react-toastify';

interface ToastProviderProps {
    children: React.ReactNode;
}

export default function ToastProvider({ children }: ToastProviderProps) {

    return (
        <>
            {children}
            <ToastContainer
                position="top-right"
                autoClose={4000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                pauseOnHover
                transition={Slide}
                style={{ top: '60px' }}
            />
        </>
    );
}