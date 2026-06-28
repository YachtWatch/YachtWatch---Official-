import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export type UserRole = 'captain' | 'crew';
export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    vesselId?: string;
    customRole?: string;
    nationality?: string;
    passportNumber?: string;
    dateOfBirth?: string;
    reminder1?: number;
    reminder2?: number;
    windUnit?: 'knots' | 'mph' | 'kmh';
    waveUnit?: 'meters' | 'feet';
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    logout: () => Promise<void>;
    updateUser: (updates: Partial<User>) => void;
    refreshUser: () => Promise<void>;
    deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Helper for timeouts
    const withTimeout = (promise: any, ms: number = 8000, errorMsg: string) => {
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms));
        return Promise.race([promise, timeout]);
    };

    useEffect(() => {
        // Use onAuthStateChange as the single source of truth to avoid race conditions
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {

            if (session?.user) {
                // Check local storage for an instant load
                const cacheKey = `yw_user_cache_${session.user.id}`;
                const cached = localStorage.getItem(cacheKey);
                if (cached && event === 'INITIAL_SESSION') {
                    try {
                        const parsedUser = JSON.parse(cached);
                        setUser(parsedUser);
                        setLoading(false); // Instant load unlock
                    } catch (e) {
                        console.warn("Failed to parse cached user data", e);
                    }
                }

                // Always re-fetch on sign-in or token refresh to prevent stale vesselId state.
                // Or if it's the initial session, we still want to fetch in the background to ensure data isn't stale.
                const shouldFetch = !user || user.id !== session.user.id || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION';
                if (shouldFetch) {
                    // Only show loading spinner on first load without cache — not on background token refreshes
                    const showLoading = (!cached || event !== 'INITIAL_SESSION') && event !== 'TOKEN_REFRESHED';
                    await fetchProfile(session.user.id, session.user.email!, session.user.user_metadata, showLoading);
                } else {
                    setLoading(false);
                }
            } else {
                setUserWrapper(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Wrapper for setUser to handle syncing to localStorage
    const setUserWrapper = (newUser: User | null | ((curr: User | null) => User | null)) => {
        setUser((currentUser) => {
            const nextUser = typeof newUser === 'function' ? newUser(currentUser) : newUser;
            if (nextUser) {
                localStorage.setItem(`yw_user_cache_${nextUser.id}`, JSON.stringify(nextUser));
            } else if (currentUser) {
                localStorage.removeItem(`yw_user_cache_${currentUser.id}`);
            }
            return nextUser;
        });
    };

    const fetchProfile = async (userId: string, email: string, metadata?: any, showLoading = true) => {

        try {
            if (showLoading) setLoading(true);
            const { data, error } = await withTimeout(
                supabase.from('profiles').select('id, first_name, last_name, role, custom_role, nationality, reminder_1, reminder_2, wind_unit, wave_unit, created_at, vessel_id').eq('id', userId).single() as any,
                8000,
                'Profile fetch timed out'
            );



            if (error && error.code !== 'PGRST116') {
                console.error('Profile fetch error:', error);
            }

            // STRICT CHECK: Only auto-create if we explicitly got "Row not found" (PGRST116).
            // Any other error (network, timeout, 500) should NOT trigger auto-create.
            if (error && error.code === 'PGRST116') {
                const firstName = (metadata?.full_name || metadata?.name)?.split(' ')[0] || email.split('@')[0] || 'New';
                const lastName = (metadata?.full_name || metadata?.name)?.split(' ').slice(1).join(' ') || 'User';
                const newProfile = {
                    id: userId,
                    email: email,
                    name: `${firstName} ${lastName}`.trim(), // Satisfies the NOT NULL constraint on profiles.name
                    first_name: firstName,
                    last_name: lastName,
                    role: (metadata?.role === 'captain' || metadata?.role === 'crew') ? metadata.role : 'crew' as UserRole,
                };


                const { error: insertError } = await withTimeout(
                    supabase.from('profiles').upsert(newProfile) as any,
                    8000,
                    'Profile creation timed out'
                );

                if (insertError) {
                    console.error("❌ [AuthDebug] Failed to auto-create profile in 'profiles' table:", insertError);
                    setUserWrapper({ id: userId, firstName: 'Pending', lastName: 'Setup', email: email, role: 'crew' });
                } else {
                    setUserWrapper({
                        id: userId,
                        firstName: newProfile.first_name,
                        lastName: newProfile.last_name,
                        email: newProfile.email,
                        role: newProfile.role,
                        vesselId: undefined,
                        customRole: undefined,
                        nationality: undefined,
                        passportNumber: undefined,
                        dateOfBirth: undefined
                    });
                }
            } else if (error) {
                // If we have an error that ISN'T "Not Found", it's a real problem (timeout, offline, etc).
                // DO NOT THROW. Instead, set a fallback user state so the user can at least log in.
                console.error("❌ [AuthDebug] Critical error fetching profile from 'profiles' table (using fallback):", error);

                // Fallback user
                const fallbackUser: User = {
                    id: userId,
                    firstName: (metadata?.full_name || metadata?.name)?.split(' ')[0] || email.split('@')[0] || 'New',
                    lastName: (metadata?.full_name || metadata?.name)?.split(' ').slice(1).join(' ') || 'User',
                    email: email,
                    role: (metadata?.role === 'captain' || metadata?.role === 'crew') ? metadata.role : 'crew' as UserRole,
                };

                setUserWrapper(currentUser => {
                    // SAFETY: If we already have this user and they have a vesselId, don't downgrade them
                    // just because of a temporary fetch error (timeout/network).
                    if (currentUser && currentUser.id === userId && currentUser.vesselId) {
                        console.warn("⚠️ Keeping existing user state despite fetch error against 'profiles' table to prevent redirect.");
                        return currentUser;
                    }
                    return fallbackUser;
                });

            } else if (data) {
                // Determine raw role (default to crew if profile is missing it)
                const rawProfileRole = data.role || 'crew';

                // Parallelize all subsequent remote data fetches to prevent waterfall delays
                const [
                    { data: vesselMember },
                    { data: secureData },
                    { data: ownedVessel }
                ] = await Promise.all([
                    supabase.from('vessel_members').select('vessel_id, role').eq('user_id', userId).limit(1).maybeSingle(),
                    supabase.from('crew_secure_data').select('passport_number, date_of_birth').eq('user_id', userId).maybeSingle(),
                    supabase.from('vessels').select('id').eq('captain_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle()
                ]);

                // 1. Resolve Final Role
                // If they have a vessel_members entry with a role, it ALWAYS wins over the global profile role.
                let finalRole = vesselMember?.role || rawProfileRole;

                // Keep the self-healing captain logic if they are completely unlinked but have the metadata
                if (finalRole === 'crew') {
                    if (finalRole === 'crew') {
                        // Check metadata first (STRONGEST SIGNAL)
                        const metadataRole = metadata?.role;
                        if (metadataRole === 'captain') {

                            finalRole = 'captain';
                            // Persist the fix
                            await supabase.from('profiles').update({ role: 'captain' }).eq('id', userId);
                        } else {
                            // Check vessel ownership — use limit(1) to handle captains who own multiple vessels
                            // (e.g. from duplicate creation). .single() throws a 406 on >1 rows, causing
                            // the self-healing logic to fail and the role to stay as 'crew'.
                            // (Result already fetched in parallel above via ownedVessel)

                            if (ownedVessel) {

                                finalRole = 'captain';
                                // Persist the fix
                                await supabase.from('profiles').update({ role: 'captain' }).eq('id', userId);
                            }
                        }
                    }
                }

                let finalVesselId = vesselMember?.vessel_id || null;

                // 2. Resolve Vessel Link and Self-Heal Captain Owner Links

                if (finalRole === 'captain') {
                    // Use limit(1) + order to pick the most recent vessel — maybeSingle() alone
                    // returns null if multiple rows match, which would clear the vesselId.
                    // (Result already fetched in parallel above via ownedVessel)

                    if (ownedVessel) {

                        finalVesselId = ownedVessel.id;

                    } else {
                        // User is captain but owns no vessel.
                        // Ensure we don't accidentally link them to a phantom vessel from a stale profile (unlikely but possible).
                        // Actually, if they are captain, they should only be linked if they own it.
                        // But maybe they are a "hired captain" linked to someone else's vessel? (Not in v1 spec).
                        // For v1: Captain = Owner.
                        if (finalVesselId) {
                            console.warn("⚠️ Captain has profile link but specific ownership check returned none. TRUSTING PROFILE LINK.");
                            // finalVesselId = undefined; // DISABLE DESTRUCTIVE OVERWRITE
                        }
                    }
                }

                // 3. Fetch Secure Data for this specific user
                // (Result already fetched in parallel above via secureData)

                setUserWrapper({
                    id: data.id,
                    firstName: data.first_name || metadata?.full_name?.split(' ')[0] || metadata?.name?.split(' ')[0] || email.split('@')[0] || 'Captain',
                    lastName: data.last_name || metadata?.full_name?.split(' ').slice(1).join(' ') || metadata?.name?.split(' ').slice(1).join(' ') || '',
                    email: data.email || email,
                    role: finalRole as UserRole,
                    vesselId: finalVesselId, // Use resolved ID
                    customRole: data.custom_role,
                    nationality: data.nationality,
                    passportNumber: secureData?.passport_number,
                    dateOfBirth: secureData?.date_of_birth,
                    reminder1: data.reminder_1 || 0,
                    reminder2: data.reminder_2 || 0,
                    windUnit: data.wind_unit || 'knots',
                    waveUnit: data.wave_unit || 'meters'
                });
            }
        } catch (err: any) {
            console.error("Unexpected error fetching profile:", err);
            // Fallback for unexpected errors
            const fallbackUser: User = {
                id: userId,
                firstName: (metadata?.full_name || metadata?.name)?.split(' ')[0] || email.split('@')[0] || 'New',
                lastName: (metadata?.full_name || metadata?.name)?.split(' ').slice(1).join(' ') || 'User',
                email: email,
                role: (metadata?.role === 'captain' || metadata?.role === 'crew') ? metadata.role : 'crew' as UserRole,
            };
            setUserWrapper(currentUser => {
                if (currentUser && currentUser.id === userId && currentUser.vesselId) {
                    return currentUser;
                }
                return fallbackUser;
            });
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUserWrapper(null);
    };

    const deleteAccount = async () => {
        if (!user) return;
        setLoading(true);
        try {
            await supabase.from('join_requests').delete().eq('user_id', user.id);
            await supabase.from('vessel_members').delete().eq('user_id', user.id);
            await supabase.from('crew_secure_data').delete().eq('user_id', user.id);
            await supabase.from('profiles').delete().eq('id', user.id);
            await supabase.auth.signOut();
            setUserWrapper(null);
        } catch (e) {
            console.error("Failed to delete account data", e);
            // Even if data deletion fails, we still sign out user to prevent them from staying in broken state
            await supabase.auth.signOut();
            setUserWrapper(null);
        } finally {
            setLoading(false);
        }
    };


    const updateUser = (updates: Partial<User>) => {
        if (!user) return;
        setUserWrapper({ ...user, ...updates });
    }

    const refreshUser = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await fetchProfile(session.user.id, session.user.email!, session.user.user_metadata, false);
            }
        } catch (e) {
            console.error("Refresh failed", e);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, logout, updateUser, refreshUser, deleteAccount }}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

