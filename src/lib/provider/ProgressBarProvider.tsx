'use client';

import { AppProgressBar as ProgressBar } from 'next-nprogress-bar';

interface ProviderProps {
    children: React.ReactNode;
}

const Providers = ({ children }: ProviderProps) => {
    return (
        <>
            {children}
            <ProgressBar
                height="3px"
                color="#00eaff"
                options={{ showSpinner: false }}
                shallowRouting={true}
                startPosition={0.3}
            />
        </>
    );
};

export default Providers;