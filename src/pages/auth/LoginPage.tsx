import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
// import { useAuth } from '../../contexts/AuthContext';
// import { useData } from '../../contexts/DataContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Anchor, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();


    // From location state or default


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);


        // TEST: Check basic network connectivity from within the app context
        try {

            await fetch('https://www.google.com', { mode: 'no-cors' });

        } catch (netErr: any) {
            console.error("❌ Network Connectivity Test Failed:", netErr);
            setError("Network Error: App cannot reach internet. " + netErr.message);
            setLoading(false);
            return;
        }

        try {


            // Create a timeout promise (increased to 60s to handle potential project pausing/cold starts)
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Login request timed out (>60s). Check if Supabase project is paused or network is down.')), 60000)
            );

            // Race the login against the timeout
            const authResponse = await Promise.race([
                supabase.auth.signInWithPassword({ email, password }),
                timeoutPromise
            ]) as any;

            const { data, error: authError } = authResponse;

            if (authError) {
                console.error("🔴 AuthService Error (auth.users table / auth.schema):", authError);
                throw authError;
            }


            if (data.user) {
                // OPTIMIZATION: Check metadata first to avoid extra network call
                const metadataRole = data.user.user_metadata?.role;


                if (metadataRole === 'captain' || metadataRole === 'crew') {

                    navigate(metadataRole === 'captain' ? '/dashboard/captain' : '/dashboard/crew', { replace: true });
                    return;
                }

                // Fallback: Fetch profile only if metadata is missing/invalid
                console.log("Fetching profile from 'profiles' table for user:", data.user.id);
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', data.user.id)
                    .single();

                if (profileError) {
                    console.error("🔴 Profile fetch Error (profiles table):", profileError);
                    console.warn("🟠 Profile fetch warning:", profileError);
                    // Only treat it as missing if we get the explicit "Row not found" code
                    if (profileError.code !== 'PGRST116') {
                        console.error("Profile fetch error detail:", profileError);
                        // Don't block login on this error if we can help it? 
                        // But we need strict role.
                        // Let's assume 'crew' if we can't tell, BUT show a warning?
                        // No, better to fail visible so they know something is wrong.
                        throw new Error(`Failed to fetch profile (Table: profiles, Code: ${profileError.code}): ` + profileError.message);
                    }
                }


                // Start: Fix logic. Only redirect if profile is strictly null AND we had a PGRST116 or empty result.
                // If profileError was something else, we threw above.
                if (!profile) {

                    navigate('/complete-profile');
                    return;
                }

                const role = profile.role || 'crew';

                navigate(role === 'captain' ? '/dashboard/captain' : '/dashboard/crew', { replace: true });
            }

        } catch (err: any) {
            console.error("❌ Login EXCEPTION:", err);
            setError(err.message || 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center space-y-2">
                    <div className="flex justify-center">
                        <Anchor className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
                    <CardDescription>
                        Enter your email to sign in to your account
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Email
                            </label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m.name@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Password
                                </label>
                                <Link to="/auth/forgot-password" className="text-sm font-medium text-primary hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        {error && <p className="text-sm text-destructive font-medium">{error}</p>}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Signing in..." : "Sign in"}
                        </Button>
                        <div className="text-center text-sm text-muted-foreground">
                            Don&apos;t have an account?{" "}
                            <Link to="/auth/signup" className="underline underline-offset-4 hover:text-primary">
                                Sign up
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div >
    );
}
