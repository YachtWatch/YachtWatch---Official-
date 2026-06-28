import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useData } from '../contexts/DataContext';

export function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [retrying, setRetrying] = useState(false);
    const { refreshData } = useData();

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isOffline) return null;

    const handleRetry = async () => {
        setRetrying(true);
        await refreshData();
        setRetrying(false);
    };

    return (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-between text-sm font-medium z-50 sticky top-0 shadow-md">
            <div className="flex items-center space-x-2">
                <WifiOff className="w-4 h-4 shrink-0" />
                <span>No connection — showing cached data.</span>
            </div>
            <button
                onClick={handleRetry}
                disabled={retrying}
                className="flex items-center gap-1 text-xs font-semibold underline-offset-2 hover:underline disabled:opacity-60"
            >
                <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
                {retrying ? 'Retrying…' : 'Retry'}
            </button>
        </div>
    );
}
