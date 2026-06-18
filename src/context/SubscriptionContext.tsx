
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Purchases, PurchasesPackage, CustomerInfo, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

interface SubscriptionContextType {
    currentCustomerInfo: CustomerInfo | null;
    offerings: PurchasesPackage[];
    isSubscribed: boolean;
    purchasePackage: (pkg: PurchasesPackage) => Promise<void>;
    restorePurchases: () => Promise<void>;
    loading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentCustomerInfo, setCurrentCustomerInfo] = useState<CustomerInfo | null>(null);
    const [offerings, setOfferings] = useState<PurchasesPackage[]>([]);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            if (Capacitor.getPlatform() === 'web') {
                console.log('[RevenueCat] Web platform detected — skipping initialization.');
                setLoading(false);
                return;
            }

            try {
                const platform = Capacitor.getPlatform();
                if (platform === 'ios') {
                    await Purchases.configure({ apiKey: 'appl_TxXCVVHhofCaDGcrSSspCfRbEGF' });
                    console.log('[RevenueCat] Initialized on iOS.');
                } else if (platform === 'android') {
                    await Purchases.configure({ apiKey: import.meta.env.VITE_REVENUECAT_API_KEY_GOOGLE });
                    console.log('[RevenueCat] Initialized on Android.');
                }

                await Purchases.setLogLevel({ level: import.meta.env.DEV ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR });

                const { customerInfo } = await Purchases.getCustomerInfo();
                setCurrentCustomerInfo(customerInfo);
                updateSubscriptionStatus(customerInfo);
                const isPro = customerInfo.entitlements.active['pro'] !== undefined;
                console.log(`[RevenueCat] Customer info loaded. Entitlement "pro" active: ${isPro}`);

                const offerings = await Purchases.getOfferings();
                if (offerings.current && offerings.current.availablePackages.length !== 0) {
                    const pkgs = offerings.current.availablePackages;
                    setOfferings(pkgs);
                    console.log(`[RevenueCat] Offerings loaded — ${pkgs.length} package(s) in current offering:`);
                    pkgs.forEach(pkg => {
                        console.log(`  → [${pkg.identifier}] ${pkg.product.title} — ${pkg.product.priceString}`);
                    });
                } else {
                    console.warn('[RevenueCat] No packages found in current offering.');
                }
            } catch (error) {
                console.error('[RevenueCat] Initialization error:', error);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, []);

    const updateSubscriptionStatus = (customerInfo: CustomerInfo) => {
        const isPro = customerInfo.entitlements.active['pro'] !== undefined;
        setIsSubscribed(isPro);
        console.log(`[RevenueCat] Subscription status updated — "pro" entitlement active: ${isPro}`);
    };

    const purchasePackage = async (pkg: PurchasesPackage) => {
        console.log(`[RevenueCat] Attempting purchase of package: ${pkg.identifier}`);
        try {
            const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
            setCurrentCustomerInfo(customerInfo);
            updateSubscriptionStatus(customerInfo);
            const isPro = customerInfo.entitlements.active['pro'] !== undefined;
            console.log(`[RevenueCat] Purchase SUCCESS — package: ${pkg.identifier} | "pro" entitlement active: ${isPro}`);
        } catch (error: any) {
            if (error.userCancelled) {
                console.log('[RevenueCat] Purchase cancelled by user.');
            } else {
                console.error(`[RevenueCat] Purchase FAILED — package: ${pkg.identifier}`, error);
            }
        }
    };

    const restorePurchases = async () => {
        console.log('[RevenueCat] Attempting to restore purchases...');
        try {
            const { customerInfo } = await Purchases.restorePurchases();
            setCurrentCustomerInfo(customerInfo);
            updateSubscriptionStatus(customerInfo);
            const isPro = customerInfo.entitlements.active['pro'] !== undefined;
            console.log(`[RevenueCat] Restore SUCCESS — "pro" entitlement active: ${isPro}`);
        } catch (error) {
            console.error('[RevenueCat] Restore FAILED:', error);
        }
    };

    return (
        <SubscriptionContext.Provider value={{ currentCustomerInfo, offerings, isSubscribed, purchasePackage, restorePurchases, loading }}>
            {children}
        </SubscriptionContext.Provider>
    );
};

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
};
