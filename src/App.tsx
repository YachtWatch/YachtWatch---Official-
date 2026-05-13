import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { ThemeProvider } from './components/theme-provider';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ToastProvider } from './components/ui/Toast';
import { NotificationListener } from './components/NotificationListener';
import { SubscriptionProvider } from './context/SubscriptionContext';
import ProtectedRoute from './components/ProtectedRoute';
import { OfflineBanner } from './components/OfflineBanner';

import { SailboatLoader } from './components/SailboatLoader';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import DashboardIndex from './pages/DashboardIndex';
const SignupPage = lazy(() => import('./pages/auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const CaptainDashboard = lazy(() => import('./pages/captain/CaptainDashboard'));
const CrewDashboard = lazy(() => import('./pages/crew/CrewDashboard'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const CompleteProfilePage = lazy(() => import('./pages/CompleteProfilePage'));
const ScheduleGeneratorWizard = lazy(() => import('./pages/captain/ScheduleGeneratorWizard'));
const CrewExportWizard = lazy(() => import('./pages/captain/CrewExportWizard'));
const DiagnosticsPage = lazy(() => import('./pages/DiagnosticsPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage'));

function RootRedirect() {
    const { user, loading } = useAuth();

    // While checking auth status (only block if we have no user yet)
    if (loading && !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <SailboatLoader />
            </div>
        );
    }

    // Native App: Redirect to Login (or Dashboard if session exists)
    if (Capacitor.isNativePlatform()) {
        if (user) {
            return <Navigate to="/dashboard" replace />;
        }
        return <Navigate to="/auth/login" replace />;
    }

    // Web: Show Landing Page
    return <LandingPage />;
}

function App() {
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            // Set a consistent status bar style
            StatusBar.setStyle({ style: Style.Dark });

            if (Capacitor.getPlatform() === 'ios') {
                StatusBar.setOverlaysWebView({ overlay: true });
                document.body.classList.add('platform-ios');
            }

            // Hold the splash for 1 second then reveal the sailboat loader
            const t = setTimeout(() => SplashScreen.hide(), 1000);
            return () => clearTimeout(t);
        }
    }, []);

    return (
        <ThemeProvider defaultTheme="light" storageKey="yachtwatch-ui-theme">
            <ToastProvider>
                <DataProvider>
                    <AuthProvider>
                        <SubscriptionProvider>
                            <NotificationListener />
                            <div className="min-h-screen bg-background text-foreground font-sans antialiased">
                                <BrowserRouter>
                                    <OfflineBanner />
                                   
                                    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><SailboatLoader /></div>}>
                                        <Routes>
                                            <Route path="/" element={<RootRedirect />} />

                                            <Route path="/auth">
                                                <Route path="login" element={<LoginPage />} />
                                                <Route path="signup" element={<SignupPage />} />
                                                <Route path="forgot-password" element={<ForgotPasswordPage />} />
                                                <Route path="reset-password" element={<ResetPasswordPage />} />
                                                <Route path="confirm" element={<div className="p-8 text-center">Please check your email to confirm your account.</div>} />
                                            </Route>

                                            {/* Public Legal Pages */}
                                            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                                            <Route path="/terms-of-service" element={<TermsOfServicePage />} />

                                            {/* Generic Protected Routes (Any Authenticated User) */}
                                            <Route element={<ProtectedRoute />}>
                                                <Route path="/dashboard" element={<DashboardIndex />} />
                                                <Route path="/complete-profile" element={<CompleteProfilePage />} />
                                                <Route path="/profile" element={<ProfilePage />} />
                                                <Route path="/settings" element={<SettingsPage />} />
                                                <Route path="/diagnostics" element={<DiagnosticsPage />} />
                                                <Route path="/subscription" element={<SubscriptionPage />} />
                                            </Route>

                                            {/* Strict Role-Based Dashboards */}
                                            <Route element={<ProtectedRoute allowedRoles={['captain']} />}>
                                                <Route path="/dashboard/captain" element={<CaptainDashboard />} />
                                                <Route path="/dashboard/captain/generate-schedule" element={<ScheduleGeneratorWizard />} />
                                                <Route path="/dashboard/captain/export-crew" element={<CrewExportWizard />} />
                                            </Route>

                                            <Route element={<ProtectedRoute allowedRoles={['crew']} />}>
                                                <Route path="/dashboard/crew" element={<CrewDashboard />} />
                                            </Route>

                                            {/* Fallback */}
                                            <Route path="*" element={<Navigate to="/" replace />} />
                                        </Routes>
                                    </Suspense>
                                </BrowserRouter>
                            </div>
                        </SubscriptionProvider>
                    </AuthProvider>
                </DataProvider>
            </ToastProvider>
        </ThemeProvider>
    );
}

export default App;
