import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { UserData, Vessel } from '../../contexts/DataContext';
import { X, Check, Printer, RefreshCw, Anchor, Compass, Coffee, Wrench, Users, Star, PenLine, Trash2, UserPlus, QrCode } from 'lucide-react';
import { InviteShareModal } from '../../components/InviteShareModal';
import QRCode from 'react-qr-code';


interface CaptainCrewViewProps {
    vessel: Vessel;
    schedule?: any;
    captainName: string;
    pendingRequests: any[];
    users: UserData[];
    onEditRole: (userId: string) => void;
    onRemoveCrew: (userId: string) => void;
    onRequestAction: (requestId: string, action: 'approved' | 'rejected') => void;
    onRefresh: () => void;
}
const DEPARTMENT_CONFIG: Record<string, { label: string, icon: any, color: string }> = {
    bridge: { label: 'Bridge', icon: Compass, color: 'text-blue-500 bg-blue-500/10' },
    deck: { label: 'Deck', icon: Anchor, color: 'text-cyan-500 bg-cyan-500/10' },
    interior: { label: 'Interior', icon: Coffee, color: 'text-purple-500 bg-purple-500/10' },
    engineering: { label: 'Engineering', icon: Wrench, color: 'text-orange-500 bg-orange-500/10' },
    galley: { label: 'Galley', icon: Wrench, color: 'text-red-500 bg-red-500/10' },
    other: { label: 'Other', icon: Users, color: 'text-gray-500 bg-gray-500/10' }
};

const CREW_POSITIONS = {
    bridge: ['Captain', 'Chief Officer', 'Second Officer', 'Third Officer', 'Mate'],
    deck: ['Bosun', 'Lead Deckhand', 'Deckhand', 'Delivery Crew'],
    interior: ['Chief Steward/ess', 'Second Steward/ess', 'Steward/ess', 'Laundry'],
    galley: ['Head Chef', 'Sous Chef', 'Cook'],
    engineering: ['Chief Engineer', 'Second Engineer', 'Third Engineer', 'ETO']
};

const getDepartment = (role: string) => {
    if (!role) return 'other';
    for (const [dept, roles] of Object.entries(CREW_POSITIONS)) {
        if (roles.includes(role)) return dept;
    }
    return 'other';
};

export function CaptainCrewView({ vessel, schedule, captainName, pendingRequests, users, onEditRole, onRemoveCrew, onRequestAction, onRefresh }: CaptainCrewViewProps) {
    const navigate = useNavigate();
    const [showInvite, setShowInvite] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    // Ensure captain is properly represented if missing from users array
    const captainUser = users.find(u => u.id === vessel.captainId) || {
        id: vessel.captainId || 'captain',
        firstName: captainName ? captainName.split(' ')[0] : 'Unknown',
        lastName: captainName ? captainName.split(' ').slice(1).join(' ') : 'Captain',
        email: '',
        role: 'captain',
        customRole: 'Captain'
    } as UserData;

    // Build the final crew list from `users`, ensuring the captain is included and first
    const finalCrewList = [
        captainUser,
        ...users.filter(u => u.id !== vessel.captainId)
    ];

    // Calculate Watch Stats
    const now = new Date();
    const currentGlobalSlot = schedule?.slots.find((slot: any) => {
        const start = new Date(slot.start);
        const end = new Date(slot.end);
        return now >= start && now < end;
    });

    const crewOnWatchIds = currentGlobalSlot?.crew.map((c: any) => c.userId) || [];

    return (
        <div className="space-y-8">

            {/* Join Code Card */}
            <Card className="bg-primary/5 border-primary/20 print:hidden">
                <CardContent className="p-6 space-y-4">
                    <div className="space-y-1 text-center">
                        <h3 className="font-semibold text-foreground">Vessel Join Code</h3>
                        <p className="text-sm text-muted-foreground">Share this code with your crew to let them join.</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <div
                            className="text-3xl font-mono font-bold tracking-[0.2em] text-primary bg-background px-6 py-3 rounded-lg border shadow-sm select-all cursor-pointer hover:border-primary transition-colors"
                            onClick={() => { navigator.clipboard.writeText(vessel.joinCode); alert('Copied to clipboard!'); }}
                            title="Click to copy"
                        >
                            {vessel.joinCode}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-medium">Click to Copy</span>
                        <button
                            type="button"
                            onClick={() => setShowQRModal(true)}
                            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                            <QrCode className="h-4 w-4" />
                            Show QR Code
                        </button>
                    </div>
                    <Button
                        variant="outline"
                        className="w-full gap-2 border-[rgba(27,42,107,0.25)] text-[#1B2A6B] hover:bg-[#1B2A6B]/5 font-semibold"
                        onClick={() => setShowInvite(true)}
                    >
                        <UserPlus className="h-4 w-4 shrink-0" />
                        Invite Crew
                    </Button>
                </CardContent>
            </Card>

            <InviteShareModal
                isOpen={showInvite}
                onClose={() => setShowInvite(false)}
                joinCode={vessel.joinCode}
            />

            {/* QR Code Modal */}
            {showQRModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
                    onClick={() => setShowQRModal(false)}
                >
                    <div
                        className="bg-background rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-lg">Scan to Join</h3>
                            <button
                                onClick={() => setShowQRModal(false)}
                                className="p-1 rounded-full hover:bg-muted"
                            >
                                <X className="h-5 w-5 text-muted-foreground" />
                            </button>
                        </div>
                        <div className="flex flex-col items-center gap-5">
                            <div className="bg-white p-5 rounded-2xl shadow-inner">
                                <QRCode
                                    value={`https://join.yachtwatch.co/${vessel.joinCode}`}
                                    size={200}
                                />
                            </div>
                            <p className="text-sm text-center text-muted-foreground">
                                Crew members can scan this with the YachtWatch app to join <strong>{vessel.name}</strong>
                            </p>
                            <div className="font-mono font-bold text-primary text-2xl tracking-[0.2em]">
                                {vessel.joinCode}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Requests Section */}
            <div className="print:hidden">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                    Pending Requests
                    {pendingRequests.length > 0 && <span className="px-2 py-1 text-xs bg-primary text-white rounded-full">{pendingRequests.length}</span>}
                    <Button variant="ghost" size="sm" className="ml-auto" onClick={onRefresh}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </h3>
                {pendingRequests.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-4 border rounded-lg bg-card/30 border-dashed">
                        No pending join requests.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingRequests.map(req => (
                            <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg bg-card shadow-sm">
                                <div>
                                    <div className="font-bold text-sm">{req.userFirstName} {req.userLastName}</div>
                                    <div className="text-xs text-muted-foreground">Request sent today</div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => onRequestAction(req.id, 'rejected')}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 text-white" onClick={() => onRequestAction(req.id, 'approved')}>
                                        <Check className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Active Crew Section */}
            <div className="print:hidden">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold">Active Crew ({finalCrewList.length})</h3>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/dashboard/captain/export-crew')}>
                        <Printer className="h-3 w-3" />
                        Export Crew List
                    </Button>
                </div>

                {finalCrewList.length === 0 ? (
                    <p className="text-muted-foreground">No crew members yet.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {finalCrewList.map(c => {
                            const role = c.customRole || c.role || (c.role === 'captain' ? 'Captain' : 'Crew');
                            const dept = getDepartment(role);
                            const config = DEPARTMENT_CONFIG[dept] || DEPARTMENT_CONFIG.other;
                            const Icon = config.icon;
                            const isOnWatch = crewOnWatchIds.includes(c.id);
                            const isCaptain = role.toLowerCase() === 'captain' || c.role === 'captain';

                            return (
                                <div key={c.id} className="relative group overflow-hidden bg-card hover:bg-accent/5 transition-colors border rounded-xl p-3 flex items-center gap-4 shadow-sm">
                                    {isOnWatch && (
                                        <div className="absolute top-2 right-2 flex gap-1">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                            </span>
                                        </div>
                                    )}

                                    <div className={`h-11 w-11 rounded-full ${config.color} flex items-center justify-center font-bold text-lg shrink-0 relative`}>
                                        {c.firstName ? c.firstName[0] : '?'}
                                        {isCaptain && (
                                            <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-yellow-900 rounded-full p-0.5 border-2 border-card">
                                                <Star className="h-3 w-3 fill-current" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-base truncate pr-4 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                {c.firstName} {c.lastName}
                                                <div className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${isOnWatch ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                                                    {isOnWatch ? 'On Watch' : 'Off Duty'}
                                                </div>
                                            </div>
                                            {!isCaptain && (
                                                <div className="flex gap-1 shrink-0">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => onEditRole(c.id)} title="Edit Role">
                                                        <PenLine className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => onRemoveCrew(c.id)} title="Remove Crew Member">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                <Icon className="h-3.5 w-3.5 opacity-70" />
                                                <span className="truncate">{role}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
