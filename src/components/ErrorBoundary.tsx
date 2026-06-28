import { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { Anchor } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: { componentStack: string }) {
        Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
    }

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-background">
                <Anchor className="h-12 w-12 text-primary mb-5" />
                <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                    An unexpected error occurred. Restart the app to continue — your data is safe.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold"
                >
                    Restart App
                </button>
            </div>
        );
    }
}
