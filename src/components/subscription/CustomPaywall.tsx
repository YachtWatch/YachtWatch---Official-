import React, { useState } from 'react';
import { X, Calendar, FileText, QrCode, Anchor, Lock } from 'lucide-react';
import { useSubscription } from '../../context/SubscriptionContext';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils'; // Assuming cn utility exists, usually in shadcn/ui setups

interface CustomPaywallProps {
    onClose: () => void;
}

const CustomPaywall: React.FC<CustomPaywallProps> = ({ onClose }) => {
    const { purchasePackage, offerings } = useSubscription();
    const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('annual');
    const [selectedTier, setSelectedTier] = useState<string | null>('6-10'); // Default to most popular

    // Tiers mapped to actual RevenueCat package identifiers from the "default" offering.
    // Packages: monthly_5, monthly_10, yearly_5, yearly_10
    const tiers = [
        {
            id: '1-5',
            name: '1-5 CREW',
            price: { monthly: 5, annual: 5 },
            rcPackageIdMonthly: 'monthly_5',
            rcPackageIdAnnual: 'yearly_5',
        },
        {
            id: '6-10',
            name: '6-10 CREW',
            price: { monthly: 10, annual: 10 },
            isPopular: true,
            rcPackageIdMonthly: 'monthly_10',
            rcPackageIdAnnual: 'yearly_10',
        },
        {
            id: '11+',
            name: '11+ CREW',
            customPrice: 'Contact Us',
            price: { monthly: 0, annual: 0 },
            rcPackageIdMonthly: '',
            rcPackageIdAnnual: '',
        }
    ];

    const handleSubscribe = async () => {
        if (!selectedTier) return;

        const tier = tiers.find(t => t.id === selectedTier);
        if (!tier) return;

        if (tier.customPrice) {
            window.location.href = "mailto:support@yachtwatch.com?subject=Enterprise Inquiry";
            return;
        }

        const targetPackageId = billingInterval === 'monthly' ? tier.rcPackageIdMonthly : tier.rcPackageIdAnnual;
        console.log(`[Paywall] Selected tier: ${tier.name} | Billing: ${billingInterval} | Target package: ${targetPackageId}`);

        const packageToPurchase = offerings.find(pkg => pkg.identifier === targetPackageId);

        if (packageToPurchase) {
            console.log(`[Paywall] Package found — sending to RevenueCat: ${packageToPurchase.identifier}`);
            await purchasePackage(packageToPurchase);
            onClose();
        } else {
            console.warn(`[Paywall] No RevenueCat package found for identifier "${targetPackageId}". Available packages: ${offerings.map(p => p.identifier).join(', ')}`);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col">

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
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2">
                        Watch Schedules, Done...
                    </h1>
                </div>

                {/* Features Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 mb-8">
                    {[
                        { icon: Calendar, text: "Create and distribute watch schedules in seconds" },
                        { icon: FileText, text: "Export customs-ready crew lists" },
                        { icon: QrCode, text: "QR code crew onboarding" }
                    ].map((feature, idx) => (
                        <div key={idx} className="bg-slate-50 flex items-center p-4 rounded-xl gap-4">
                            <div className="bg-slate-200 p-2 rounded-lg text-slate-700">
                                <feature.icon className="h-6 w-6" />
                            </div>
                            <span className="font-medium text-slate-700 text-sm">{feature.text}</span>
                        </div>
                    ))}
                </div>

                {/* Toggle */}
                <div className="flex flex-col items-center justify-center mb-6">
                    <div className="bg-slate-100 p-1 rounded-full flex relative">
                        <button
                            onClick={() => setBillingInterval('monthly')}
                            className={cn(
                                "px-8 py-2 rounded-full text-sm font-semibold transition-all z-10",
                                billingInterval === 'monthly' ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillingInterval('annual')}
                            className={cn(
                                "px-8 py-2 rounded-full text-sm font-semibold transition-all z-10 flex items-center gap-2",
                                billingInterval === 'annual' ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Annually

                        </button>
                        {/* Save Badge */}
                        <div className="absolute -top-3 -right-6 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                            SAVE 15%
                        </div>
                    </div>
                    <div className="text-center text-xs font-medium text-slate-500 mt-3">
                        14-Day Free Trial | Cancel Anytime
                    </div>
                </div>

                {/* Pricing Tiers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 mb-8 mt-6">
                    {tiers.map((tier) => (
                        <div
                            key={tier.id}
                            onClick={() => setSelectedTier(tier.id)}
                            className={cn(
                                "relative border-2 rounded-2xl p-4 cursor-pointer transition-all hover:border-blue-300 flex flex-col items-center text-center",
                                selectedTier === tier.id ? "border-slate-800 bg-slate-50/50" : "border-slate-100 md:opacity-80 md:hover:opacity-100"
                            )}
                        >
                            {tier.isPopular && (
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-slate-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                    Most Popular
                                </div>
                            )}

                            <div className="text-xs font-bold text-slate-500 uppercase mb-2">{tier.name}</div>

                            {(tier as any).customPrice ? (
                                <div className="flex items-center h-[44px] mb-1">
                                    <span className="text-2xl font-bold text-slate-900">{(tier as any).customPrice}</span>
                                </div>
                            ) : (() => {
                                const rcId = billingInterval === 'monthly' ? tier.rcPackageIdMonthly : tier.rcPackageIdAnnual;
                                const rcPkg = offerings.find(p => p.identifier === rcId);
                                if (rcPkg) {
                                    const isAnnual = billingInterval === 'annual';
                                    const perMonthPrice = isAnnual
                                        ? `$${(rcPkg.product.price / 12).toFixed(2)}`
                                        : rcPkg.product.priceString;
                                    return (
                                        <div className="flex flex-col items-center mb-1">
                                            <div className="flex items-baseline">
                                                <span className="text-3xl font-bold text-slate-900">{perMonthPrice}</span>
                                                <span className="text-xs text-slate-500 ml-1">/mo</span>
                                            </div>
                                            {isAnnual && (
                                                <span className="text-[10px] text-slate-400">{rcPkg.product.priceString}/yr</span>
                                            )}
                                        </div>
                                    );
                                }
                                return (
                                    <div className="flex items-baseline mb-1 h-[44px]">
                                        <span className="text-slate-400 text-sm">Loading...</span>
                                    </div>
                                );
                            })()}

                            <div className="text-[10px] text-slate-400 mb-4 italic">
                                {(tier as any).customPrice ? 'Custom enterprise plan' : (billingInterval === 'monthly' ? 'Billed monthly' : 'Billed annually')}
                            </div>

                            {/* Features list removed as per request */}

                            {/* Mobile Selection Indicator */}
                            <div className={cn(
                                "w-4 h-4 rounded-full border-2 absolute top-4 right-4 flex items-center justify-center",
                                selectedTier === tier.id ? "border-blue-600" : "border-slate-300"
                            )}>
                                {selectedTier === tier.id && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                            </div>
                        </div>
                    ))}
                </div>

                {/* User Tip / Footer Action - Sticky on mobile? */}
                <div className="mt-auto p-6 bg-slate-50 border-t border-slate-100 rounded-b-3xl">
                    <Button
                        size="lg"
                        className="w-full text-lg font-semibold bg-slate-700 hover:bg-slate-800 text-white py-6 h-auto"
                        onClick={handleSubscribe}
                    >
                        {selectedTier && tiers.find(t => t.id === selectedTier) && (tiers.find(t => t.id === selectedTier) as any).customPrice ? 'Contact Sales' : 'Continue'}
                    </Button>
                    <p className="text-center text-[11px] text-slate-400 mt-2">
                        Cancel anytime. Subscription renews automatically unless cancelled.
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-400 uppercase tracking-widest">
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

