import React, { useEffect } from 'react';
import { PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { useSubscription } from '../context/SubscriptionContext';
import { Analytics } from '../services/AnalyticsService';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Check } from 'lucide-react';

const Paywall: React.FC = () => {
    const { offerings, purchasePackage, isSubscribed } = useSubscription();

    useEffect(() => { Analytics.paywallViewed(); }, []);

    if (isSubscribed) {
        return (
            <div className="flex flex-col items-center justify-center p-6 text-center">
                <h2 className="text-2xl font-bold mb-2">You're a Pro Member!</h2>
                <p className="text-muted-foreground">Thank you for supporting YachtWatch.</p>
            </div>
        );
    }

    if (offerings.length === 0) {
        return (
            <div className="p-6 text-center">
                <p>No offerings available at the moment.</p>
            </div>
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto p-6">
            {offerings.map((pkg: PurchasesPackage) => (
                <Card key={pkg.identifier} className="flex flex-col">
                    <CardHeader>
                        <CardTitle>{pkg.product.title}</CardTitle>
                        <CardDescription>{pkg.product.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <div className="text-3xl font-bold mb-4">
                            {pkg.product.priceString}
                        </div>
                        <ul className="space-y-2">
                            {/* TODO(founders): confirm this benefit copy matches App Store listing + terms. */}
                            <li className="flex items-center">
                                <Check className="mr-2 h-4 w-4 text-primary" />
                                <span>Unlimited watch schedules</span>
                            </li>
                            <li className="flex items-center">
                                <Check className="mr-2 h-4 w-4 text-primary" />
                                <span>Full crew management &amp; approvals</span>
                            </li>
                            <li className="flex items-center">
                                <Check className="mr-2 h-4 w-4 text-primary" />
                                <span>PDF crew manifest export</span>
                            </li>
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={() => { Analytics.subscriptionPurchased(pkg.identifier); purchasePackage(pkg); }}>
                            Subscribe
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
};

export default Paywall;
