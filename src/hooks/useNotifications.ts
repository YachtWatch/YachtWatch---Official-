import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { NotificationService } from '../services/NotificationService';
import { supabase } from '../lib/supabase';

export function useNotifications() {
    const { user, refreshUser } = useAuth();
    const { schedules, refreshData } = useData();
    const activeSchedule = user?.vesselId ? schedules.find(s => s.vesselId === user.vesselId) : undefined;

    // 1. Register for local + push notifications on mount
    useEffect(() => {
        NotificationService.requestPermissions().then(granted => {
            console.log(`[Notifications] Local notification permission granted: ${granted}`);
        });
        NotificationService.registerPushNotifications();
    }, []);

    // 2. Watch Reminders
    useEffect(() => {
        if (!user || !user.vesselId) return;

        // If we have an active schedule, schedule reminders
        if (activeSchedule) {

            NotificationService.scheduleWatchReminders(
                activeSchedule,
                user.id,
                user.reminder1 || 0,
                user.reminder2 || 0
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, user?.vesselId, user?.reminder1, user?.reminder2, activeSchedule]);

    // 3. Realtime Listeners
    useEffect(() => {
        if (!user) return;



        // CHANNEL 0: PROFILE CHANGES (Self) - Ensure AuthContext stays in sync
        const profileChannel = supabase.channel('profile-updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`
                },
                () => {
                    // Debounce refresh to prevent loops from self-healing updates
                    const now = Date.now();
                    const lastRefresh = parseInt(sessionStorage.getItem('lastProfileRefresh') || '0');
                    if (now - lastRefresh > 2000) {
                        sessionStorage.setItem('lastProfileRefresh', now.toString());
                        refreshUser(); // Sync AuthContext
                        refreshData(); // Sync DataContext
                    }
                }
            )
            .subscribe();

        // CHANNEL 1: CAPTAIN ALERTS (Join Requests)
        let captainChannel: any = null;
        if (user.role === 'captain' && user.vesselId) {
            captainChannel = supabase.channel('captain-alerts')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'join_requests',
                        filter: `vessel_id=eq.${user.vesselId}`
                    },
                    () => {
                        NotificationService.sendLocalAlert(
                            'New Crew Request',
                            `A new crew member has requested to join your vessel.`
                        );
                        refreshData();
                    }
                )
                .subscribe();
        }

        // CHANNEL 2: CREW ALERTS (Approval)
        let crewChannel: any = null;
        if (user.role === 'crew') {
            crewChannel = supabase.channel('crew-alerts')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'join_requests',
                        filter: `user_id=eq.${user.id}`
                    },
                    (payload: any) => {

                        if (payload.new.status === 'approved' && payload.old.status !== 'approved') {
                            NotificationService.sendLocalAlert(
                                'Request Approved!',
                                `You have been approved to join the vessel.`
                            );
                            refreshUser(); // Force refresh to get vesselId
                            refreshData();
                        }
                    }
                )
                .subscribe();
        }

        // CHANNEL 3: SCHEDULE ALERTS (All Users in a Vessel)
        let scheduleChannel: any = null;
        if (user.vesselId) {
            scheduleChannel = supabase.channel('schedule-updates')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'schedules',
                        filter: `vessel_id=eq.${user.vesselId}`
                    },
                    (payload) => {

                        if (payload.eventType === 'INSERT') {
                            refreshData();
                        } else if (payload.eventType === 'UPDATE') {
                            refreshData();
                        } else if (payload.eventType === 'DELETE') {

                            refreshData();
                        }
                    }
                )
                .subscribe();
        }

        return () => {
            supabase.removeChannel(profileChannel);
            if (captainChannel) supabase.removeChannel(captainChannel);
            if (crewChannel) supabase.removeChannel(crewChannel);
            if (scheduleChannel) supabase.removeChannel(scheduleChannel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, user?.vesselId, user?.role]);
}
