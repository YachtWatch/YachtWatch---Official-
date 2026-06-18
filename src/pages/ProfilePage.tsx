import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft, Save, User, Pencil, ChevronDown, Search, X } from 'lucide-react';
import { COUNTRIES } from '../lib/countries';

function CountryPickerModal({
    open,
    selected,
    onSelect,
    onClose,
}: {
    open: boolean;
    selected: string;
    onSelect: (country: string) => void;
    onClose: () => void;
}) {
    const [search, setSearch] = useState('');

    const filtered = useMemo(
        () => COUNTRIES.filter(c => c.toLowerCase().includes(search.toLowerCase())),
        [search]
    );

    useEffect(() => {
        if (!open) setSearch('');
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onClose}>
            <div
                className="bg-background rounded-t-2xl flex flex-col"
                style={{ maxHeight: '75vh' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>
                <div className="flex items-center justify-between px-4 py-2 border-b">
                    <span className="text-base font-semibold">Select Nationality</span>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
                        <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                </div>
                <div className="px-4 py-2 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            autoFocus
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search countries…"
                            className="pl-9"
                        />
                    </div>
                </div>
                <div className="overflow-y-auto flex-1 py-1">
                    {filtered.length === 0 && (
                        <p className="text-center text-muted-foreground text-sm py-6">No countries found</p>
                    )}
                    {filtered.map(country => (
                        <button
                            key={country}
                            type="button"
                            onClick={() => { onSelect(country); onClose(); }}
                            className={`w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors ${country === selected ? 'font-semibold text-primary bg-primary/5' : ''}`}
                        >
                            {country}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const { user, updateUser } = useAuth();
    const { updateUserInStore } = useData();
    const navigate = useNavigate();

    const [firstName, setFirstName] = useState(user?.firstName || '');
    const [lastName, setLastName] = useState(user?.lastName || '');
    const [email, setEmail] = useState(user?.email || '');
    const [customRole, setCustomRole] = useState(user?.customRole || '');
    const [nationality, setNationality] = useState(user?.nationality || '');
    const [passportNumber, setPassportNumber] = useState(user?.passportNumber || '');
    const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || '');

    const [showNationalityPicker, setShowNationalityPicker] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);


    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);


        const updates = {
            firstName,
            lastName,
            customRole,
            nationality,
            passportNumber,
            dateOfBirth
        };

        // Update local auth context
        updateUser(updates);

        // Update in database
        await updateUserInStore(user.id, updates);

        setSaving(false);

        setIsEditing(false);

    };

    return (
        <>
        <CountryPickerModal
            open={showNationalityPicker}
            selected={nationality}
            onSelect={setNationality}
            onClose={() => setShowNationalityPicker(false)}
        />
        <div className="min-h-screen bg-background">
            <header className="border-b bg-card sticky top-0 z-50 safe-area-pt">
                <div className="container mx-auto px-4 h-16 flex items-center gap-4">
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
                    <h1 className="font-semibold">Profile</h1>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 max-w-lg">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                                <User className="h-8 w-8 text-primary" />
                            </div>
                            <div className="flex-1">
                                <CardTitle>{user?.firstName} {user?.lastName}</CardTitle>
                                <CardDescription className="capitalize">
                                    {user?.role}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isEditing ? (
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">First Name</label>
                                        <Input
                                            value={firstName}
                                            onChange={e => setFirstName(e.target.value)}
                                            placeholder="First Name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Last Name</label>
                                        <Input
                                            value={lastName}
                                            onChange={e => setLastName(e.target.value)}
                                            placeholder="Last Name"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email</label>
                                    <Input
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        type="email"
                                        placeholder="your@email.com"
                                        disabled
                                        className="opacity-60"
                                    />
                                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Role Title / Position</label>
                                    <Input
                                        value={customRole}
                                        onChange={e => setCustomRole(e.target.value)}
                                        placeholder="e.g. Bosun, Chef, Deckhand"
                                    />
                                </div>

                                <div className="flex gap-3 items-end">
                                    <div className="flex-1 min-w-0 overflow-hidden space-y-2">
                                        <label className="text-sm font-medium">Date of Birth</label>
                                        <Input
                                            type="date"
                                            value={dateOfBirth}
                                            onChange={e => setDateOfBirth(e.target.value)}
                                            className="w-full h-10"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0 overflow-hidden space-y-2">
                                        <label className="text-sm font-medium">Nationality</label>
                                        <button
                                            type="button"
                                            onClick={() => setShowNationalityPicker(true)}
                                            className="w-full h-10 px-3 flex items-center justify-between rounded-md border border-input bg-background text-sm"
                                        >
                                            <span className={`truncate ${nationality ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                {nationality || 'Nationality'}
                                            </span>
                                            <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Passport Number</label>
                                    <Input
                                        value={passportNumber}
                                        onChange={e => setPassportNumber(e.target.value)}
                                        placeholder="Passport No."
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="flex-1" disabled={saving}>
                                        <Save className="h-4 w-4 mr-2" />
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name</label>
                                        <div className="text-base font-medium">{user?.firstName} {user?.lastName}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
                                        <div className="text-base font-medium">{user?.email}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role Title</label>
                                        <div className="text-base font-medium">{user?.customRole || 'Not set'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nationality</label>
                                        <div className="text-base font-medium">{user?.nationality || 'Not set'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date of Birth</label>
                                        <div className="text-base font-medium">{user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'Not set'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Passport Number</label>
                                        <div className="text-base font-medium font-mono">{user?.passportNumber || 'Not set'}</div>
                                    </div>
                                </div>
                                <Button className="w-full" onClick={() => setIsEditing(true)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit Profile
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
        </>
    );
}
