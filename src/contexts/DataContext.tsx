import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

import { NotificationService } from '../services/NotificationService';

export type WatchType = 'anchor' | 'Navigation' | 'dock';

export interface StandingOrder {
    id: string;
    text: string;
    time?: string;              // HH:mm — optional daily reminder time
    requiresCompletion: boolean;
}

export interface WatchConfig {
    crewPerWatch: number;
    duration: number;
    startHour?: number;
    endHour?: number;
    weekdayStartHour?: number;
    weekdayEndHour?: number;
    weekendStartHour?: number;
    weekendEndHour?: number;
    isStaggered?: boolean;
    watchLeaderCount?: number;
}

export const WATCH_TYPE_DEFAULTS: Record<WatchType, Partial<WatchConfig>> = {
    'Navigation': {
        crewPerWatch: 2,
        duration: 4,
        isStaggered: false,
    },
    'anchor': {
        crewPerWatch: 1,
        duration: 4,
        startHour: 20,
        endHour: 8,
        isStaggered: false,
    },
    'dock': {
        crewPerWatch: 1,
        duration: 12,
        startHour: 8,
        endHour: 20,
        weekdayStartHour: 8,
        weekdayEndHour: 20,
        weekendStartHour: 8,
        weekendEndHour: 20,
        isStaggered: false,
    },
};

export function getWatchTypeDefaults(watchType: WatchType): WatchConfig {
    const defaults = WATCH_TYPE_DEFAULTS[watchType];
    return {
        crewPerWatch: defaults.crewPerWatch || 2,
        duration: defaults.duration || 4,
        startHour: defaults.startHour,
        endHour: defaults.endHour,
        isStaggered: defaults.isStaggered || false,
        watchLeaderCount: 0,
    };
}

export interface Vessel {
    id: string;
    captainId: string;
    name: string;
    length: number;
    type: 'motor' | 'sail';
    capacity: number;
    joinCode: string;
    checkInEnabled: boolean;
    checkInInterval: number;
    timezone: string;
}

export interface JoinRequest {
    id: string;
    userId: string;
    userFirstName: string;
    userLastName: string;
    vesselId: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
}

export interface WatchSchedule {
    id: string;
    vesselId: string;
    name: string;
    watchType: WatchType;
    createdAt: string;
    timezone: string;
    watchConfig: WatchConfig;
    standingOrders?: StandingOrder[];
    acknowledgments?: Record<string, string>;    // userId → ISO timestamp of ack
    orderCompletions?: Record<string, string[]>; // userId → [completedOrderId, ...]
    slots: {
        id: number;
        start: string;
        end: string;
        crew: { userId: string; userFirstName: string; userLastName: string; checkedInAt?: string }[];
        condition?: 'always' | 'outside-watch-hours' | 'weekend-only';
    }[];
}

export interface UserData {
    id: string;
    email: string;
    password?: string; // In a real app, this would be hashed
    firstName: string;
    lastName: string;
    role: 'captain' | 'crew';
    customRole?: string; // e.g. "Bosun", "Chief Stew"
    vesselId?: string | null;
    // Extended profile fields for Crew List Export
    nationality?: string;
    passportNumber?: string;
    dateOfBirth?: string;
    reminder1?: number; // Minutes before watch
    reminder2?: number; // Minutes before watch
    isWatchLeader?: boolean;
}

interface DataContextType {
    vessels: Vessel[];
    requests: JoinRequest[];
    schedules: WatchSchedule[];
    createVessel: (vessel: Omit<Vessel, 'id' | 'joinCode'>) => Promise<Vessel | null>;
    getVessel: (id: string) => Vessel | undefined;
    getVesselByJoinCode: (code: string) => Vessel | undefined;
    requestJoin: (userId: string, userFirstName: string, userLastName: string, code: string) => Promise<{ success: boolean; message: string }>;
    getRequestsForVessel: (vesselId: string) => JoinRequest[];
    updateRequestStatus: (requestId: string, status: 'approved' | 'rejected') => Promise<void>;
    getCrewVessel: (userId: string) => Vessel | undefined;
    getPendingRequest: (userId: string) => JoinRequest | undefined;
    createSchedule: (schedule: Omit<WatchSchedule, 'id'>) => Promise<void>;
    updateScheduleSlot: (vesselId: string, slotId: number, crewIds: string[]) => Promise<void>;
    updateScheduleSettings: (vesselId: string, updates: Partial<WatchSchedule>) => Promise<void>;
    getSchedule: (vesselId: string) => WatchSchedule | undefined;
    users: UserData[];
    updateUserInStore: (userId: string, updates: Partial<UserData>) => Promise<void>;
    loading: boolean;
    initialLoadComplete: boolean;
    removeCrew: (vesselId: string, userId: string) => Promise<void>;
    updateCrewRole: (vesselId: string, userId: string, newRole: string) => void;
    toggleWatchLeader: (vesselId: string, userId: string, isLeader: boolean) => Promise<void>;
    updateVesselSettings: (vesselId: string, updates: Partial<Vessel>) => Promise<void>;
    checkInToWatch: (vesselId: string, slotId: number, userId: string) => Promise<void>;
    confirmWatchAlert: (vesselId: string, slotId: number, userId: string) => Promise<void>;
    deleteSchedule: (vesselId: string) => Promise<void>;
    refreshData: () => Promise<void>;
    acknowledgeStandingOrders: (vesselId: string, userId: string) => Promise<void>;
    completeStandingOrder: (vesselId: string, userId: string, orderId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Database interfaces representing the exact schema of Supabase tables
interface SupabaseProfile {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: 'captain' | 'crew';
    custom_role?: string;
    nationality?: string;
    reminder_1?: number;
    reminder_2?: number;
}

interface SupabaseVessel {
    id: string;
    captain_id: string;
    name: string;
    length: number;
    type: 'motor' | 'sail';
    capacity: number;
    join_code: string;
    check_in_enabled: boolean;
    check_in_interval?: number;
    timezone?: string;
}

interface SupabaseJoinRequest {
    id: string;
    user_id: string;
    user_first_name?: string;
    user_last_name?: string;
    vessel_id: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

interface SupabaseSchedule {
    id: string;
    vessel_id: string;
    name: string;
    watch_type: WatchType;
    created_at: string;
    timezone?: string;
    watch_config?: WatchConfig;
    standing_orders?: StandingOrder[];
    acknowledgments?: Record<string, string>;
    order_completions?: Record<string, string[]>;
    slots: {
        id: number;
        start: string;
        end: string;
        crew: { userId: string; userFirstName: string; userLastName: string; checkedInAt?: string }[];
        condition?: 'always' | 'weekend-only' | 'outside-watch-hours';
    }[];
}

export function DataProvider({ children }: { children: ReactNode }) {
    const [vessels, setVessels] = useState<Vessel[]>([]);
    const [requests, setRequests] = useState<JoinRequest[]>([]);
    const [schedules, setSchedules] = useState<WatchSchedule[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);

    const mapProfile = (p: SupabaseProfile): UserData => ({
        id: p.id,
        email: p.email,
        password: '',
        firstName: p.first_name || '',
        lastName: p.last_name || '',
        role: p.role,
        customRole: p.custom_role,
        vesselId: undefined, // Populated via vessel_members mapping later
        nationality: p.nationality,
        passportNumber: undefined, // Fetched securely if Captain/Self
        dateOfBirth: undefined,    // Fetched securely if Captain/Self
        reminder1: p.reminder_1 || 0,
        reminder2: p.reminder_2 || 0
    });

    const mapVessel = (v: SupabaseVessel): Vessel => ({
        id: v.id,
        captainId: v.captain_id,
        name: v.name,
        length: Number(v.length),
        type: v.type,
        capacity: v.capacity,
        joinCode: v.join_code,
        checkInEnabled: v.check_in_enabled,
        checkInInterval: v.check_in_interval || 15,
        timezone: v.timezone || 'UTC',
    });

    const mapRequest = (r: SupabaseJoinRequest): JoinRequest => ({
        id: r.id,
        userId: r.user_id,
        userFirstName: r.user_first_name || '',
        userLastName: r.user_last_name || '',
        vesselId: r.vessel_id,
        status: r.status,
        createdAt: r.created_at
    });

    const mapSchedule = (s: SupabaseSchedule): WatchSchedule => ({
        id: s.id,
        vesselId: s.vessel_id,
        name: s.name,
        watchType: s.watch_type,
        createdAt: s.created_at,
        timezone: s.timezone || 'UTC',
        watchConfig: s.watch_config || getWatchTypeDefaults(s.watch_type),
        standingOrders: s.standing_orders || [],
        acknowledgments: s.acknowledgments || {},
        orderCompletions: s.order_completions || {},
        slots: s.slots
    });

    // State to track if we have loaded initial data to avoid spamming notifications on startup
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);

    // Refs to track known IDs for diffing
    const knownRequestIds = useRef<Set<string>>(new Set());
    const knownScheduleIds = useRef<Set<string>>(new Set());
    // Debounce ref: prevents cascading full-refreshes when multiple realtime events arrive together
    const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Guard ref: prevents re-scheduling watch reminders on every check-in (only re-run when schedule/prefs change)
    const lastRemindersKeyRef = useRef<string | null>(null);

    const loadFromCache = () => {
        try {
            const cached = localStorage.getItem('yachtwatch_offline_data');
            if (cached) {
                const data = JSON.parse(cached);
                if (data.users) setUsers(data.users);
                if (data.vessels) setVessels(data.vessels);
                if (data.requests) setRequests(data.requests);
                if (data.schedules) setSchedules(data.schedules);
                console.log("Loaded data from offline cache.");
            }
        } catch (e) {
            console.error("Failed to parse local cache", e);
        }
    };

    const refreshData = async () => {
        if (!navigator.onLine) {
            console.log("Offline mode: Skipping fetch, loading from cache.");
            loadFromCache();
            if (!initialLoadComplete) setInitialLoadComplete(true);
            return;
        }

        try {
            let usersWithVessels: UserData[] = [];
            const { data: authUser } = await supabase.auth.getUser();

            if (authUser?.user) {
                const uid = authUser.user.id;

                // ── STEP 1: Determine active vessel and role reliably ──
                // For captains: look up the vessel they OWN (not vessel_members, which can have stale test entries)
                // For crew: look up their approved join_request (source of truth for membership)

                let activeVesselId: string | null = null;
                let isCaptain = false;

                // Check if user is a captain of any vessel
                const { data: ownedVessel } = await supabase
                    .from('vessels')
                    .select('id')
                    .eq('captain_id', uid)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (ownedVessel) {
                    activeVesselId = ownedVessel.id;
                    isCaptain = true;
                } else {
                    // Not a captain — find active vessel via approved join_request
                    const { data: approvedReq } = await supabase
                        .from('join_requests')
                        .select('vessel_id')
                        .eq('user_id', uid)
                        .eq('status', 'approved')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (approvedReq) {
                        activeVesselId = approvedReq.vessel_id;
                    }
                }

                if (activeVesselId) {
                    if (isCaptain) {
                        // 🚢 CAPTAIN: Fetch the full manifest (includes secure passports/DOBs) via RPC
                        const { data: manifestData, error: manifestError } = await supabase.rpc('get_crew_manifest', { v_vessel_id: activeVesselId });

                        if (manifestData) {
                            usersWithVessels = (manifestData as any[]).map(row => {
                                const isMe = row.user_id === uid;
                                return {
                                    id: row.user_id,
                                    email: '',
                                    password: '',
                                    firstName: row.first_name || (isMe ? authUser.user.user_metadata?.full_name?.split(' ')[0] || authUser.user.user_metadata?.name?.split(' ')[0] || authUser.user.email?.split('@')[0] || 'Captain' : 'Unknown'),
                                    lastName: row.last_name || (isMe ? authUser.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || authUser.user.user_metadata?.name?.split(' ').slice(1).join(' ') || '' : ''),
                                    role: row.role || 'crew',
                                    customRole: row.custom_role,
                                    vesselId: activeVesselId,
                                    nationality: row.nationality,
                                    passportNumber: row.passport_number,
                                    dateOfBirth: row.date_of_birth,
                                    reminder1: 0,
                                    reminder2: 0
                                };
                            }).sort((a, b) => a.firstName.localeCompare(b.firstName));
                        } else {
                            console.error("Failed to load Captain Manifest via RPC:", manifestError);
                        }

                    } else {
                        // ⚓️ CREW: Fetch public profile data ONLY! No passports.
                        const { data: memberData, error: memberError } = await supabase
                            .from('vessel_members')
                            .select('user_id, role, vessel_id')
                            .eq('vessel_id', activeVesselId);

                        if (memberError) {
                            console.error("❌ [RLS DEBUG] Error fetching vessel_members:", memberError);
                        }

                        if (memberData && memberData.length > 0) {
                            let userIds = memberData.map(m => m.user_id);

                            // ⭐️ CRITICAL FIX: The Captain is NOT in `vessel_members`. 
                            // We MUST manually ensure the captain runs through this profile query too so they appear in Shipmates.
                            const { data: vesselData } = await supabase.from('vessels').select('captain_id').eq('id', activeVesselId).single();
                            const vesselCapId = vesselData?.captain_id;
                            if (vesselCapId && !userIds.includes(vesselCapId)) {
                                userIds.push(vesselCapId);
                            }

                            const { data: profilesData, error: profilesError } = await supabase
                                .from('profiles')
                                .select('id, first_name, last_name, email, custom_role, nationality, reminder_1, reminder_2')
                                .in('id', userIds);

                            if (profilesError) {
                                console.error("❌ [RLS DEBUG] Error fetching profiles:", profilesError);
                            }

                            if (profilesData) {
                                usersWithVessels = profilesData.map(profile => {
                                    const mem = memberData.find(m => m.user_id === profile.id);
                                    const isMe = profile.id === uid;
                                    return {
                                        id: profile.id,
                                        email: profile.email,
                                        password: '',
                                        firstName: profile.first_name || (isMe ? authUser.user.user_metadata?.full_name?.split(' ')[0] || authUser.user.user_metadata?.name?.split(' ')[0] || authUser.user.email?.split('@')[0] || 'Unknown' : (profile.email?.split('@')[0] || 'Unknown')),
                                        lastName: profile.last_name || (isMe ? authUser.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || authUser.user.user_metadata?.name?.split(' ').slice(1).join(' ') || '' : ''),
                                        role: profile.id === vesselCapId ? 'captain' : (mem?.role || 'crew'),
                                        customRole: profile.custom_role,
                                        vesselId: activeVesselId,
                                        nationality: profile.nationality,
                                        passportNumber: undefined,
                                        dateOfBirth: undefined,
                                        reminder1: profile.reminder_1 || 0,
                                        reminder2: profile.reminder_2 || 0
                                    };
                                }).sort((a, b) => a.firstName.localeCompare(b.firstName));
                            }
                        }

                        // Always stitch in the current user's OWN secure data
                        const { data: mySecureData } = await supabase.from('crew_secure_data').select('passport_number, date_of_birth').eq('user_id', uid).maybeSingle();
                        if (mySecureData) {
                            const meIndex = usersWithVessels.findIndex(u => u.id === uid);
                            if (meIndex >= 0) {
                                usersWithVessels[meIndex].passportNumber = mySecureData.passport_number;
                                usersWithVessels[meIndex].dateOfBirth = mySecureData.date_of_birth;
                            }
                        }
                    }

                } else {
                    // If they have no vessel, fetch their own profile
                    const { data: me } = await supabase.from('profiles').select('id, first_name, last_name, email, role, custom_role, nationality, reminder_1, reminder_2, created_at, vessel_id').eq('id', uid).single();
                    const { data: mySecureData } = await supabase.from('crew_secure_data').select('passport_number, date_of_birth').eq('user_id', uid).maybeSingle();

                    if (me) {
                        const baseProfile = mapProfile(me as SupabaseProfile);
                        if (mySecureData) {
                            baseProfile.passportNumber = mySecureData.passport_number;
                            baseProfile.dateOfBirth = mySecureData.date_of_birth;
                        }
                        usersWithVessels = [baseProfile];
                    }
                }
            }

            setUsers(usersWithVessels);

            const { data: vData } = await supabase.from('vessels').select('id, captain_id, name, length, type, capacity, join_code, check_in_enabled, check_in_interval, timezone, created_at');
            const newVessels = vData ? (vData as SupabaseVessel[]).map(mapVessel) : [];
            if (vData) setVessels(newVessels);

            const { data: rData } = await supabase.from('join_requests').select('id, vessel_id, user_id, user_first_name, user_last_name, status, created_at');
            let newRequests: JoinRequest[] = [];
            if (rData) {
                newRequests = (rData as SupabaseJoinRequest[]).map(mapRequest);
                setRequests(newRequests);

                // Notification Logic for Join Requests
                if (initialLoadComplete) {
                    newRequests.forEach(req => {
                        if (!knownRequestIds.current.has(req.id)) {
                            // New Request Found!
                            handleNewRequestNotification(req);
                            knownRequestIds.current.add(req.id);
                        }
                    });
                } else {
                    // Initial Load - just populate
                    newRequests.forEach(req => knownRequestIds.current.add(req.id));
                }
            }

            // ORDER BY created_at DESC to ensure we always get the latest schedule first
            const { data: sData } = await supabase.from('schedules').select('id, vessel_id, name, watch_type, watch_config, timezone, slots, standing_orders, acknowledgments, order_completions, created_at').order('created_at', { ascending: false });
            let newSchedules: WatchSchedule[] = [];
            if (sData) {
                newSchedules = (sData as SupabaseSchedule[]).map(mapSchedule);
                setSchedules(newSchedules);

                // Notification Logic for Schedules
                if (initialLoadComplete) {
                    newSchedules.forEach(sch => {
                        if (!knownScheduleIds.current.has(sch.id)) {
                            handleNewScheduleNotification(sch);
                            knownScheduleIds.current.add(sch.id);
                        }
                    });
                } else {
                    newSchedules.forEach(sch => knownScheduleIds.current.add(sch.id));
                }
            }

            // Cache data for offline usage
            localStorage.setItem('yachtwatch_offline_data', JSON.stringify({
                users: usersWithVessels,
                vessels: newVessels,
                requests: newRequests,
                schedules: newSchedules
            }));

            if (!initialLoadComplete) setInitialLoadComplete(true);
        } catch (error) {
            console.error("Network or fetch error during refresh, loading from cache", error);
            loadFromCache();
            if (!initialLoadComplete) setInitialLoadComplete(true);
        }
    };

    const handleNewRequestNotification = async (req: JoinRequest) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        // Check if I am the captain
        const { data: vessel } = await supabase.from('vessels').select('captain_id, name').eq('id', req.vesselId).single();
        if (vessel && vessel.captain_id === user.id) {
            NotificationService.sendLocalAlert('New Join Request', `${req.userFirstName} ${req.userLastName} requests to join ${vessel.name}`);
        }
        // Also check if *I* am the one who was approved (status change) - but this function detects NEW requests (pending).
        // Approved requests are updates, not inserts. 
    };

    const handleNewScheduleNotification = async (sch: WatchSchedule) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        // Check if I am a crew member of this vessel
        const { data: profileVessel } = await supabase.from('vessel_members').select('vessel_id').eq('user_id', user.id).limit(1).maybeSingle();
        if (profileVessel && profileVessel.vessel_id === sch.vesselId) {
            NotificationService.sendLocalAlert('New Watch Schedule', `A new schedule "${sch.name}" has been published.`);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                await refreshData();
            } catch (err) {
                console.error("Unhandled error in refreshData:", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();

        // Debounced refresh: coalesces multiple rapid realtime events into a single fetch.
        const scheduleRefresh = () => {
            if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
            refreshDebounceRef.current = setTimeout(() => refreshData(), 500);
        };

        // Realtime Subscription
        const channel = supabase.channel('vital-updates')
            // Join Requests (INSERT) -> Just refresh (polling handles notification via diff)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'join_requests' }, () => {
                scheduleRefresh();
            })
            // Join Requests (UPDATE) -> Notify Crew (Approved/Declined)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'join_requests' }, async (payload: any) => {
                scheduleRefresh();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const updatedRequest = payload.new;
                if (updatedRequest.user_id === user.id) {
                    if (updatedRequest.status === 'approved') {
                        NotificationService.sendLocalAlert('Welcome Aboard!', `Your request to join has been approved.`);
                    } else if (updatedRequest.status === 'rejected') {
                        NotificationService.sendLocalAlert('Request Rejected', `Your request to join was rejected.`);
                    }
                }
            })
            // Schedules (INSERT) -> Just refresh (polling handles notification)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'schedules' }, () => {
                scheduleRefresh();
            })
            // Schedules (UPDATE) -> Notify Crew of changes
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'schedules' }, async (payload: any) => {
                scheduleRefresh();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const updatedSchedule = payload.new;
                // Check if I am a crew member of this vessel (or the captain)
                const { data: profileVessel } = await supabase.from('vessel_members').select('vessel_id').eq('user_id', user.id).limit(1).maybeSingle();

                if (profileVessel && profileVessel.vessel_id === updatedSchedule.vessel_id) {
                    NotificationService.sendLocalAlert('Schedule Updated', `The schedule "${updatedSchedule.name}" has been updated.`);
                }
            })
            // Schedules (DELETE) -> Refresh to clear deleted schedule from UI
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'schedules' }, () => {
                scheduleRefresh();
            })
            // Join Requests (DELETE) -> Refresh when request is removed (e.g., crew kicked)
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'join_requests' }, () => {
                scheduleRefresh();
            })
            // Vessel Members (ALL) -> Refresh when someone is kicked, added, or role changes
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'vessel_members' }, () => {
                scheduleRefresh();
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vessel_members' }, () => {
                scheduleRefresh();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vessel_members' }, () => {
                scheduleRefresh();
            })
            .subscribe();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                scheduleRefresh();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            supabase.removeChannel(channel);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
        };
    }, []);

    // Effect to schedule local notifications for upcoming watches.
    // Guarded by a key ref so it only re-runs when the schedule ID or reminder
    // preferences actually change — not on every check-in that mutates slot data.
    useEffect(() => {
        const scheduleReminders = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const currentUser = users.find(u => u.id === user.id);
            if (!currentUser) return;

            const mySchedule = schedules.find(s => s.vesselId === currentUser.vesselId);
            if (!mySchedule) return;

            const key = `${mySchedule.id}-${currentUser.reminder1 || 0}-${currentUser.reminder2 || 0}`;
            if (lastRemindersKeyRef.current === key) return;
            lastRemindersKeyRef.current = key;

            await NotificationService.scheduleWatchReminders(
                mySchedule,
                currentUser.id,
                currentUser.reminder1 || 0,
                currentUser.reminder2 || 0
            );
        };

        scheduleReminders();
    }, [schedules, users]); // Re-schedule when data updates

    // Initial Permission Request
    useEffect(() => {
        NotificationService.requestPermissions();
    }, []);

    const updateUserInStore = async (userId: string, updates: Partial<UserData>) => {
        // 1. Update Public Profile Data
        const dbUpdates: Partial<SupabaseProfile> = {};
        if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
        if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
        if (updates.role !== undefined) dbUpdates.role = updates.role as 'crew' | 'captain';
        if (updates.customRole !== undefined) dbUpdates.custom_role = updates.customRole;
        if (updates.nationality !== undefined) dbUpdates.nationality = updates.nationality;
        if (updates.reminder1 !== undefined) dbUpdates.reminder_1 = updates.reminder1;
        if (updates.reminder2 !== undefined) dbUpdates.reminder_2 = updates.reminder2;

        if (Object.keys(dbUpdates).length > 0) {
            const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', userId);
            if (error) console.error("❌ PUBLIC PROFILE UPDATE FAILED:", error);
        }

        // 2. Update Secure Vault Data
        const secureUpdates: any = {};
        let needsSecureUpdate = false;

        if (updates.passportNumber !== undefined) {
            secureUpdates.passport_number = updates.passportNumber;
            needsSecureUpdate = true;
        }
        if (updates.dateOfBirth !== undefined) {
            secureUpdates.date_of_birth = updates.dateOfBirth || null;
            needsSecureUpdate = true;
        }

        if (needsSecureUpdate) {
            // Use UPSERT because the row might not exist in crew_secure_data yet
            secureUpdates.user_id = userId;
            const { error: vaultError } = await supabase.from('crew_secure_data').upsert(secureUpdates);
            if (vaultError) console.error("❌ VAULT UPDATE FAILED:", vaultError);
        }

        await refreshData();
    };

    const createVessel = async (data: Omit<Vessel, 'id' | 'joinCode'>): Promise<Vessel | null> => {
        const joinCode = Math.random().toString(36).substr(2, 6).toUpperCase();
        // Let server generate ID or use UUID
        const tempId = crypto.randomUUID();

        const dbVessel: SupabaseVessel = {
            id: tempId,
            captain_id: data.captainId,
            name: data.name,
            length: data.length,
            type: data.type,
            capacity: data.capacity,
            join_code: joinCode,
            check_in_enabled: data.checkInEnabled,
            check_in_interval: data.checkInInterval
        };



        // 1. Insert Vessel
        const { error: insertError } = await supabase.from('vessels').insert(dbVessel);
        if (insertError) {
            console.error("❌ VESSEL INSERT FAILED:", insertError);
            alert(`Failed to create vessel: ${insertError.message}`);
            return null;
        }

        // 2. Link captain to vessel_members
        await supabase.from('vessel_members').upsert(
            { vessel_id: tempId, user_id: data.captainId, role: 'captain' },
            { onConflict: 'user_id, vessel_id' }
        );

        await refreshData();
        return mapVessel(dbVessel);
    };

    const getVessel = (id: string) => vessels.find(v => v.id === id);
    const getVesselByJoinCode = (code: string) => vessels.find(v => v.joinCode === code.trim().toUpperCase());

    const requestJoin = async (userId: string, userFirstName: string, userLastName: string, code: string) => {
        const cleanCode = code.trim().toUpperCase();
        let vessel = getVesselByJoinCode(cleanCode);

        // Always query the server as a fallback because local state `vessels` 
        // might not contain vessels the user isn't a member of.
        if (!vessel) {
            console.log(`[JoinReq] Code ${cleanCode} not in local cache, querying server...`);
            const { data, error } = await supabase.from('vessels').select('id, captain_id, name, length, type, capacity, join_code, check_in_enabled, check_in_interval, timezone, created_at').eq('join_code', cleanCode).maybeSingle();

            if (error) {
                console.error("❌ Join Request Vessel Lookup Failed:", error);
                return { success: false, message: "Error looking up vessel" };
            }

            if (data) {
                vessel = mapVessel(data);
            }
        }

        if (!vessel) return { success: false, message: "Invalid Join Code" };

        const { error } = await supabase.from('join_requests').insert({
            user_id: userId,
            user_name: `${userFirstName} ${userLastName}`.trim(),
            user_first_name: userFirstName,
            user_last_name: userLastName,
            vessel_id: vessel.id,
            status: 'pending'
        });

        if (error) {
            console.error("❌ Join Request Insert Failed:", error);
            // Check for unique constraint violation (user already requested)
            if (error.code === '23505') {
                return { success: false, message: "You have already requested to join this vessel." };
            }
            return { success: false, message: error.message };
        }

        await refreshData();
        return { success: true, message: "Request sent to Captain" };
    };

    const getRequestsForVessel = (vesselId: string) => requests.filter(r => r.vesselId === vesselId);

    const updateRequestStatus = async (requestId: string, status: 'approved' | 'rejected') => {
        const { error } = await supabase.from('join_requests').update({ status }).eq('id', requestId);
        if (error) throw error;

        const request = requests.find(r => r.id === requestId);
        if (request) {
            if (status === 'approved') {
                const { error: insertError } = await supabase
                    .from('vessel_members')
                    .upsert({
                        vessel_id: request.vesselId,
                        user_id: request.userId,
                        role: 'crew'
                    }, { onConflict: 'user_id, vessel_id' });

                if (insertError) console.error("Failed to add vessel member:", insertError);
            }
        }
        await refreshData();
    };

    const getCrewVessel = (userId: string) => {
        const approvedRequest = requests.find(r => r.userId === userId && r.status === 'approved');
        if (approvedRequest) return getVessel(approvedRequest.vesselId);
        return undefined;
    };

    const getPendingRequest = (userId: string) => requests.find(r => r.userId === userId && r.status === 'pending');

    const createSchedule = async (schedule: Omit<WatchSchedule, 'id'>) => {


        // 1. Delete ALL existing schedules for this vessel to prevent duplicates
        const { error: deleteError } = await supabase.from('schedules').delete().eq('vessel_id', schedule.vesselId);
        if (deleteError) {
            console.error("❌ Failed to clear old schedules:", deleteError);
            // We proceed anyway, but warn
        } else {

        }

        // 2. Insert new schedule
        const { error: insertError } = await supabase.from('schedules').insert({
            vessel_id: schedule.vesselId,
            name: schedule.name,
            watch_type: schedule.watchType,
            timezone: schedule.timezone,
            watch_config: schedule.watchConfig,
            slots: schedule.slots,
            standing_orders: schedule.standingOrders || [],
            acknowledgments: {},
            order_completions: {},
        });

        if (insertError) {
            console.error("❌ Failed to create schedule:", insertError);
            alert("Failed to publish schedule. Please try again.");
            return;
        }

        await refreshData();
    };

    const deleteSchedule = async (vesselId: string) => {
        const { error } = await supabase.from('schedules').delete().eq('vessel_id', vesselId);

        if (error) {
            console.error("Error deleting schedule:", error);
            throw error;
        }

        await refreshData();
    };

    const updateScheduleSlot = async (vesselId: string, slotId: number, crewIds: string[]) => {
        const schedule = schedules.find(s => s.vesselId === vesselId);
        if (!schedule) return;

        const newSlots = schedule.slots.map(slot => {
            if (slot.id === slotId) {
                const updatedCrew = crewIds.map(id => {
                    const existingEntry = slot.crew.find((c: any) => c.userId === id);
                    if (existingEntry) return existingEntry;
                    const req = requests.find(r => r.userId === id && r.vesselId === vesselId);
                    return { userId: id, userFirstName: req ? req.userFirstName : 'Unknown', userLastName: req ? req.userLastName : '' };
                });
                return { ...slot, crew: updatedCrew };
            }
            return slot;
        });

        await supabase.from('schedules').update({ slots: newSlots }).eq('id', schedule.id);
        await refreshData();
    };

    const updateScheduleSettings = async (vesselId: string, updates: Partial<WatchSchedule>) => {
        const schedule = schedules.find(s => s.vesselId === vesselId);
        if (!schedule) return;

        const dbUpdates: Partial<SupabaseSchedule> = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.watchType) dbUpdates.watch_type = updates.watchType;

        await supabase.from('schedules').update(dbUpdates).eq('id', schedule.id);
        await refreshData();
    };

    const getSchedule = (vesselId: string) => schedules.find(s => s.vesselId === vesselId);

    const removeCrew = async (vesselId: string, userId: string) => {
        const schedule = schedules.find(s => s.vesselId === vesselId);

        // Check if user is in an active schedule
        if (schedule) {
            const isUserInSchedule = schedule.slots.some(slot =>
                slot.crew.some(c => c.userId === userId)
            );

            if (isUserInSchedule) {
                const msg = "cannot leave vessel while included in an active watch schedule, please talk to master";
                alert(msg);
                throw new Error(msg);
            }
        }

        // Proceed with removal if not in schedule


        // Optimistic UI Update
        setRequests(prev => prev.filter(r => !(r.userId === userId && r.vesselId === vesselId)));
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, vesselId: undefined } : u));

        try {
            // Remove the link directly from vessel_members
            const { error: membersError } = await supabase
                .from('vessel_members')
                .delete()
                .eq('user_id', userId)
                .eq('vessel_id', vesselId);

            if (membersError) {
                console.error("Failed to remove crew member from vessel_members:", membersError);
                throw membersError;
            }

            // Also remove the join request, since that is now used as the source of truth for active vessel
            const { error: requestError } = await supabase
                .from('join_requests')
                .delete()
                .eq('user_id', userId)
                .eq('vessel_id', vesselId);

            if (requestError) {
                console.error("Failed to remove crew member from join_requests:", requestError);
                // We don't throw here to avoid failing if they didn't have a join request for some reason
            }

        } catch (e) {
            console.error("Removal failed:", e);
            let errorMessage = "Unknown error";
            if (e instanceof Error) {
                errorMessage = e.message;
            } else if (typeof e === 'object' && e !== null && 'message' in e) {
                errorMessage = (e as any).message;
            } else if (typeof e === 'string') {
                errorMessage = e;
            }
            alert(`Failed to remove crew member: ${errorMessage}`);
            // Revert optimistic update by forcing a refresh
            await refreshData();
            return;
        }

        await refreshData();
    };

    const updateCrewRole = async (vesselId: string, userId: string, newRole: string) => {
        // Optimistic UI Update
        setUsers(prev => prev.map(u =>
            (u.id === userId && u.vesselId === vesselId) ? { ...u, role: newRole as 'crew' | 'captain', customRole: newRole } : u
        ));

        const { error } = await supabase
            .from('vessel_members')
            .update({ role: newRole })
            .eq('vessel_id', vesselId)
            .eq('user_id', userId);

        if (error) {
            console.error("Failed to update crew role:", error);
            await refreshData(); // Revert on failure
        }
    };

    const toggleWatchLeader = async (vesselId: string, userId: string, isLeader: boolean) => {
        const newUsers = users.map(c => {
            if (c.id === userId && c.vesselId === vesselId) {
                return { ...c, isWatchLeader: isLeader };
            }
            return c;
        });

        // Optimistic update
        setUsers(newUsers);

        const { error } = await supabase
            .from('vessel_members')
            .update({ is_watch_leader: isLeader })
            .eq('vessel_id', vesselId)
            .eq('user_id', userId);

        if (error) {
            console.error("Failed to update watch leader status:", error);
            await refreshData();
        }
    };

    const checkInToWatch = async (vesselId: string, slotId: number, userId: string) => {
        const schedule = schedules.find(s => s.vesselId === vesselId);
        if (!schedule) return;

        const newSlots = schedule.slots.map(slot => {
            if (slot.id === slotId) {
                const newCrew = slot.crew.map((c: any) => {
                    if (c.userId === userId) {
                        // Should we use ISO string for consistency? checking usage.. currently using localeTimeString.
                        // Let's stick to localeTimeString for display simplicity as per existing code, or switch to ISO if needed for calc.
                        // Existing code: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        // We need comparisons, so ISO is better for 'lastActiveAt'.
                        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                        return { ...c, checkedInAt: timeString, lastActiveAt: new Date().toISOString() };
                    }
                    return c;
                });
                return { ...slot, crew: newCrew };
            }
            return slot;
        });

        await supabase.from('schedules').update({ slots: newSlots }).eq('id', schedule.id);
        await refreshData();
    };

    const confirmWatchAlert = async (vesselId: string, slotId: number, userId: string) => {
        const schedule = schedules.find(s => s.vesselId === vesselId);
        if (!schedule) return;

        const newSlots = schedule.slots.map(slot => {
            if (slot.id === slotId) {
                const newCrew = slot.crew.map((c: any) => {
                    if (c.userId === userId) {
                        return { ...c, lastActiveAt: new Date().toISOString() };
                    }
                    return c;
                });
                return { ...slot, crew: newCrew };
            }
            return slot;
        });

        await supabase.from('schedules').update({ slots: newSlots }).eq('id', schedule.id);
        await refreshData();
    };

    const updateVesselSettings = async (vesselId: string, updates: Partial<Vessel>) => {
        const dbUpdates: Partial<SupabaseVessel> = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.length) dbUpdates.length = updates.length;
        if (updates.capacity) dbUpdates.capacity = updates.capacity;
        if (updates.checkInEnabled !== undefined) dbUpdates.check_in_enabled = updates.checkInEnabled;
        if (updates.checkInInterval) dbUpdates.check_in_interval = updates.checkInInterval;
        if (updates.timezone) dbUpdates.timezone = updates.timezone;

        await supabase.from('vessels').update(dbUpdates).eq('id', vesselId);
        await refreshData();
    };

    const acknowledgeStandingOrders = async (vesselId: string, userId: string) => {
        const schedule = schedules.find(s => s.vesselId === vesselId);
        if (!schedule) return;
        const newAck = { ...(schedule.acknowledgments || {}), [userId]: new Date().toISOString() };
        await supabase.from('schedules').update({ acknowledgments: newAck }).eq('id', schedule.id);
        await refreshData();
    };

    const completeStandingOrder = async (vesselId: string, userId: string, orderId: string) => {
        const schedule = schedules.find(s => s.vesselId === vesselId);
        if (!schedule) return;
        const existing = schedule.orderCompletions?.[userId] || [];
        if (existing.includes(orderId)) return;
        const newCompletions = { ...(schedule.orderCompletions || {}), [userId]: [...existing, orderId] };
        await supabase.from('schedules').update({ order_completions: newCompletions }).eq('id', schedule.id);
        await refreshData();
    };

    return (
        <DataContext.Provider value={{
            vessels, requests, schedules, createVessel, getVessel, getVesselByJoinCode,
            requestJoin, getRequestsForVessel, updateRequestStatus, getCrewVessel, getPendingRequest,
            createSchedule, updateScheduleSlot, updateScheduleSettings, getSchedule,
            users, updateUserInStore, loading, initialLoadComplete,
            removeCrew, updateCrewRole, toggleWatchLeader, updateVesselSettings, checkInToWatch, confirmWatchAlert, deleteSchedule, refreshData,
            acknowledgeStandingOrders, completeStandingOrder
        }}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
}
