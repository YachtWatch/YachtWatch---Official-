import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { ArrowLeft, Moon, Sun, Bell, Ship, Globe, Anchor } from 'lucide-react';
import { useTheme } from '../components/theme-provider';

import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { ProfileDropdown } from '../components/ui/ProfileDropdown';
import { NotificationService } from '../services/NotificationService';

function formatOffset(tz: string): string {
    try {
        const parts = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date());
        return parts.find(p => p.type === 'timeZoneName')?.value.replace('GMT', 'UTC') ?? tz;
    } catch { return tz; }
}

export default function SettingsPage() {
    const navigate = useNavigate();
    const { user, updateUser, deleteAccount } = useAuth();
    const { getVessel, updateVesselSettings, updateUserInStore } = useData();
    const { theme, setTheme } = useTheme();
    const [notifying, setNotifying] = useState(false);

    const vessel = user?.vesselId ? getVessel(user.vesselId) : undefined;
    const isCaptain = user?.role === 'captain';

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b bg-card sticky top-0 z-50 safe-area-pt">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between pt-[5px]">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                if (window.history.length > 2) {
                                    navigate(-1);
                                } else {
                                    navigate(user?.role === 'captain' ? '/dashboard/captain' : '/dashboard/crew');
                                }
                            }}
                            className="p-2 -ml-2 hover:bg-accent rounded-lg transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div className="flex items-center gap-2 font-bold text-xl text-primary">
                            <Anchor className="h-6 w-6" />
                            <span>YachtWatch</span>
                        </div>
                    </div>
                    <ProfileDropdown />
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 max-w-lg space-y-8">

                {/* Profile Settings Section */}
                <div className="space-y-4">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-1">Profile Settings</h2>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Appearance</CardTitle>
                            <CardDescription>Customize how the app looks</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                                    <div>
                                        <div className="font-medium">Theme</div>
                                        <div className="text-sm text-muted-foreground capitalize">{theme}</div>
                                    </div>
                                </div>
                                <div className="flex bg-secondary rounded-lg p-1">
                                    <button
                                        onClick={() => setTheme('light')}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${theme === 'light' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        Light
                                    </button>
                                    <button
                                        onClick={() => setTheme('dark')}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        Dark
                                    </button>
                                    <button
                                        onClick={() => setTheme('system')}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${theme === 'system' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        System
                                    </button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Bell className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg">Notifications</CardTitle>
                            </div>
                            <CardDescription>Manage your watch alerts</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium">Reminder</label>
                                    <div className="text-sm text-muted-foreground my-1">
                                        Select how many minutes before your watch you want to be notified.
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">1st Reminder</label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={String(user?.reminder1 || '0')}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                updateUser({ reminder1: val });
                                                if (user?.id) updateUserInStore(user.id, { reminder1: val });
                                            }}
                                        >
                                            <option value="0">None</option>
                                            <option value="5">5 min before</option>
                                            <option value="10">10 min before</option>
                                            <option value="15">15 min before</option>
                                            <option value="20">20 min before</option>
                                            <option value="25">25 min before</option>
                                            <option value="30">30 min before</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">2nd Reminder</label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={String(user?.reminder2 || '0')}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                updateUser({ reminder2: val });
                                                if (user?.id) updateUserInStore(user.id, { reminder2: val });
                                            }}
                                        >
                                            <option value="0">None</option>
                                            <option value="5">5 min before</option>
                                            <option value="10">10 min before</option>
                                            <option value="15">15 min before</option>
                                            <option value="20">20 min before</option>
                                            <option value="25">25 min before</option>
                                            <option value="30">30 min before</option>
                                        </select>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">Notifications will be sent on this device.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Vessel Settings Section (Captain Only) */}
                {isCaptain && vessel && (
                    <div className="space-y-4">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-1">Vessel Settings</h2>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Globe className="h-5 w-5 text-primary" />
                                    <CardTitle className="text-lg">Vessel Timezone</CardTitle>
                                </div>
                                <CardDescription>All crew must have their phone set to this timezone</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                                    <div>
                                        <div className="font-medium">{formatOffset(vessel.timezone)}</div>
                                        <div className="text-xs text-muted-foreground">{vessel.timezone}</div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                                            await updateVesselSettings(vessel.id, { timezone: tz });
                                        }}
                                    >
                                        Set to my device
                                    </Button>
                                </div>
                                <Button
                                    variant="default"
                                    className="w-full"
                                    disabled={notifying}
                                    onClick={async () => {
                                        setNotifying(true);
                                        await NotificationService.triggerPushNotification('timezone_updated', {
                                            vesselId: vessel.id,
                                            timezone: vessel.timezone,
                                        });
                                        setNotifying(false);
                                    }}
                                >
                                    {notifying ? 'Sending…' : 'Notify crew to update timezone'}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Ship className="h-5 w-5 text-primary" />
                                        <CardTitle className="text-lg">Watch Check-Ins</CardTitle>
                                    </div>
                                </div>
                                <Switch
                                    checked={vessel.checkInEnabled}
                                    onCheckedChange={(checked) => updateVesselSettings(vessel.id, { checkInEnabled: checked })}
                                />
                            </CardHeader>
                            <CardContent className="space-y-6 pt-4">
                                <div className={vessel.checkInEnabled ? "space-y-3" : "space-y-3 opacity-50 pointer-events-none"}>
                                    <label className="text-sm font-medium">Watch Acknowledgement Interval</label>
                                    <div className="flex gap-2">
                                        {[15, 30, 45, 60].map(mins => (
                                            <Button
                                                key={mins}
                                                variant={vessel.checkInInterval === mins ? "default" : "outline"}
                                                onClick={() => updateVesselSettings(vessel.id, { checkInInterval: mins })}
                                                className="flex-1"
                                                size="sm"
                                            >
                                                {mins}m
                                            </Button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Crew must check in every {vessel.checkInInterval} minutes while on watch.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <div className="pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">About</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-3">
                            <div>YachtWatch v1.0.0</div>
                            <div>© 2026 YachtWatch</div>
                            <Button
                                variant="outline"
                                className="w-full mt-2 gap-2"
                                onClick={() => window.open('https://yachtwatch.co/#contact', '_blank')}
                            >
                                Contact Us
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full gap-2 text-muted-foreground"
                                onClick={() => window.open('https://yachtwatch.co/privacy-policy', '_blank')}
                            >
                                Privacy Policy
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full gap-2 text-muted-foreground"
                                onClick={() => window.open('https://yachtwatch.co/terms-of-service', '_blank')}
                            >
                                Terms of Service
                            </Button>
                            <Button
                                variant="destructive"
                                className="w-full gap-2 mt-4"
                                onClick={async () => {
                                    if (window.confirm("Are you sure you want to delete your account? This will disconnect you from your vessels and permanently delete your data.")) {
                                        try {
                                            await deleteAccount();
                                            navigate('/');
                                        } catch {
                                            window.alert("Sorry — we couldn't delete your account just now. Please try again, or contact support if the problem persists.");
                                        }
                                    }
                                }}
                            >
                                Delete Account
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
