import React from 'react';
import { X, Lock, Anchor } from 'lucide-react';
import { useSubscription } from '../../context/SubscriptionContext';
import { Button } from '../ui/button';

interface CustomPaywallProps {
    onClose: () => void;
}

const CustomPaywall: React.FC<CustomPaywallProps> = ({ onClose }) => {
    const { purchasePackage, offerings } = useSubscription();

    const monthlyPackage = offerings.find(p => p.identifier === 'Monthly') ?? offerings[0];

    const handleSubscribe = async () => {
        if (!monthlyPackage) return;
        await purchasePackage(monthlyPackage);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-center p-6 pb-2">
                    <div className="flex items-center gap-2 font-bold text-xl text-primary">
                        <Anchor className="h-6 w-6" />
                        <span>YachtWatch</span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="h-6 w-6 text-slate-500" />
                    </button>
                </div>

                {/* Hero */}
                <div className="text-center px-6 py-4">
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-3">
                        The Hard Part's Done.
                    </h1>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        Your crew is added.<br />
                        Your schedule is built.<br />
                        All that's left is to publish it.
                    </p>
                </div>

                {/* Price Card */}
                <div className="mx-6 mb-6 mt-4 border-2 border-primary rounded-2xl p-6 text-center">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Unlimited schedules. One subscription.</div>
                    {monthlyPackage ? (
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-5xl font-extrabold text-slate-900">
                                {monthlyPackage.product.priceString}
                            </span>
                            <span className="text-slate-500 text-sm">/month per vessel</span>
                        </div>
                    ) : (
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-5xl font-extrabold text-slate-900">$14.99</span>
                            <span className="text-slate-500 text-sm">/month per vessel</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 pt-0">
                    <Button
                        size="lg"
                        className="w-full text-lg font-semibold bg-primary hover:bg-primary/90 text-white py-6 h-auto"
                        onClick={handleSubscribe}
                    >
                        Publish My Schedule
                    </Button>
                    <p className="text-center text-[11px] text-slate-400 mt-2">
                        Subscription renews automatically unless cancelled.
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-3 text-xs text-slate-400 uppercase tracking-widest">
                        <Lock className="h-3 w-3" />
                        Secure & Encrypted Payments
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-3">
                        <a
                            href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-slate-400 underline hover:text-slate-600 transition-colors"
                        >
                            Terms of Use
                        </a>
                        <a
                            href="https://yachtwatch.co/privacy-policy"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-slate-400 underline hover:text-slate-600 transition-colors"
                        >
                            Privacy Policy
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomPaywall;
