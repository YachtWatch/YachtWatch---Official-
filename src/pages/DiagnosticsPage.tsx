import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function DiagnosticsPage() {
    const [session, setSession] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [vessels, setVessels] = useState<any[]>([]);
    const [, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const runDiagnostics = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Get Session
            const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
            setSession(currentSession);

            if (sessionError) throw new Error("Session Error: " + sessionError.message);

            if (currentSession?.user) {
                // 2. Get Profile
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', currentSession.user.id)
                    .single();

                setProfile(profileData || { error: profileError });

                // 3. Get Vessels (Direct Check)
                const { data: vesselData, error: vesselError } = await supabase
                    .from('vessels')
                    .select('*')
                    .eq('captain_id', currentSession.user.id);

                setVessels(vesselData || [{ error: vesselError }]);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        runDiagnostics();
    }, []);

    return (
        <div className="p-8 space-y-6 bg-background min-h-screen text-foreground font-mono text-xs">
            <h1 className="text-2xl font-bold mb-4">System Diagnostics</h1>
            <Button onClick={runDiagnostics}>Refresh Data</Button>

            {error && (
                <div className="bg-destructive/20 p-4 rounded text-destructive border border-destructive">
                    CRITICAL ERROR: {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader><CardTitle>Auth Session</CardTitle></CardHeader>
                    <CardContent>
                        <pre className="whitespace-pre-wrap break-all">
                            {session ? JSON.stringify(session.user, null, 2) : "NO SESSION"}
                        </pre>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Database Profile (public.profiles)</CardTitle></CardHeader>
                    <CardContent>
                        <pre className="whitespace-pre-wrap break-all">
                            {JSON.stringify(profile, null, 2)}
                        </pre>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader><CardTitle>Owned Vessels (public.vessels)</CardTitle></CardHeader>
                    <CardContent>
                        <pre className="whitespace-pre-wrap break-all">
                            {JSON.stringify(vessels, null, 2)}
                        </pre>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
