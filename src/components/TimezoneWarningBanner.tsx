import { useState } from 'react';
import { Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { NotificationService } from '../services/NotificationService';

function formatOffset(tz: string): string {
    try {
        const parts = new Intl.DateTimeFormat('en', {
            timeZone: tz,
            timeZoneName: 'shortOffset',
        }).formatToParts(new Date());
        const tzPart = parts.find(p => p.type === 'timeZoneName');
        return tzPart?.value.replace('GMT', 'UTC') ?? tz;
    } catch {
        return tz;
    }
}

export function TimezoneWarningBanner() {
    const { user } = useAuth();
    const { getVessel, updateVesselSettings } = useData();
    const [updating, setUpdating] = useState(false);

    const vessel = user?.vesselId ? getVessel(user.vesselId) : undefined;
    if (!vessel || !user) return null;

    const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const vesselTimezone = vessel.timezone || 'UTC';

    if (deviceTimezone === vesselTimezone) return null;

    const vesselOffset = formatOffset(vesselTimezone);
    const deviceOffset = formatOffset(deviceTimezone);
    const isCaptain = user.role === 'captain';

    const handleUpdate = async () => {
        setUpdating(true);
        await updateVesselSettings(vessel.id, { timezone: deviceTimezone });
        NotificationService.triggerPushNotification('timezone_updated', {
            vesselId: vessel.id,
            timezone: deviceTimezone,
        });
        setUpdating(false);
    };

    return (
        <div className="bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between gap-3 text-sm font-medium shadow-md">
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <Clock className="w-4 h-4 shrink-0" />
                {isCaptain ? (
                    <span className="truncate">
                        Your device is {deviceOffset} — vessel is set to {vesselOffset}.
                    </span>
                ) : (
                    <span className="truncate">
                        Wrong timezone. Update your phone to <strong>{vesselOffset}</strong> in Settings → General → Date &amp; Time.
                    </span>
                )}
            </div>
            {isCaptain && (
                <button
                    onClick={handleUpdate}
                    disabled={updating}
                    className="shrink-0 bg-white text-amber-600 text-xs font-semibold px-3 py-1 rounded-full disabled:opacity-50"
                >
                    {updating ? 'Updating…' : `Set vessel to ${deviceOffset}`}
                </button>
            )}
        </div>
    );
}
