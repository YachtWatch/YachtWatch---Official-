import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Capacitor } from '@capacitor/core';

// TODO: Replace with real App Store / Play Store URLs once the app is published.
const IOS_STORE_URL = 'https://apps.apple.com/app/yachtwatch/id000000000';
const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.yachtwatch.ios';

function detectPlatform(): 'ios' | 'android' | 'other' {
    const ua = navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
    if (/android/i.test(ua)) return 'android';
    return 'other';
}

export default function JoinPage() {
    const { code } = useParams<{ code: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [redirecting, setRedirecting] = useState(false);

    const joinCode = code?.toUpperCase() ?? '';

    useEffect(() => {
        if (!joinCode) return;

        // Persist the code so CrewDashboard can pick it up after login/signup.
        localStorage.setItem('pendingJoinCode', joinCode);

        if (Capacitor.isNativePlatform()) {
            // Universal Links should intercept before the app's web view ever loads
            // this page, but handle gracefully just in case.
            if (user) {
                navigate('/dashboard/crew', { replace: true });
            } else {
                navigate('/auth/login', { replace: true });
            }
            return;
        }

        const platform = detectPlatform();

        if (platform === 'ios' || platform === 'android') {
            setRedirecting(true);

            // Try the custom URL scheme first (opens app if installed).
            window.location.href = `yachtwatch://join/${joinCode}`;

            // After 1.5 s, if still here the app isn't installed — go to store.
            const t = setTimeout(() => {
                window.location.href = platform === 'ios' ? IOS_STORE_URL : ANDROID_STORE_URL;
            }, 1500);

            return () => clearTimeout(t);
        }

        // Desktop: if the user is authenticated, send them straight to the crew dashboard.
        if (user) {
            navigate('/dashboard/crew', { replace: true });
        }
        // Otherwise just show the download prompt below.
    }, [joinCode, user, navigate]);

    return (
        <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-8 text-center space-y-5">
                <div className="text-5xl">⚓</div>
                <h1 className="text-2xl font-bold text-[#1B2A6B]">Join YachtWatch</h1>

                {joinCode && (
                    <div className="bg-[#1B2A6B]/5 rounded-xl py-4 px-6 space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                            Your Join Code
                        </p>
                        <p className="text-3xl font-mono font-bold text-[#1B2A6B] tracking-widest">
                            {joinCode}
                        </p>
                    </div>
                )}

                {redirecting ? (
                    <p className="text-sm text-muted-foreground">
                        Opening YachtWatch… if nothing happens, download the app from the store below.
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Download YachtWatch to join your vessel. Then enter the code above to get started.
                    </p>
                )}

                <div className="flex flex-col gap-3 pt-2">
                    <a
                        href={IOS_STORE_URL}
                        className="block w-full py-3 px-4 rounded-xl bg-[#1B2A6B] text-white font-semibold text-sm hover:bg-[#1B2A6B]/90 transition-colors"
                    >
                        Download on the App Store
                    </a>
                    <a
                        href={ANDROID_STORE_URL}
                        className="block w-full py-3 px-4 rounded-xl border border-[#1B2A6B] text-[#1B2A6B] font-semibold text-sm hover:bg-[#1B2A6B]/5 transition-colors"
                    >
                        Get it on Google Play
                    </a>
                </div>

                {joinCode && (
                    <p className="text-xs text-muted-foreground">
                        Already have the app? Open it and enter code{' '}
                        <span className="font-mono font-bold">{joinCode}</span> manually.
                    </p>
                )}
            </div>
        </div>
    );
}
