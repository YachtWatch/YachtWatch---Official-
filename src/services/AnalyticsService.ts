import posthog from 'posthog-js'

const enabled = import.meta.env.PROD

export const Analytics = {
    identify(userId: string, role: 'captain' | 'crew') {
        if (!enabled) return
        posthog.identify(userId, { role })
    },

    reset() {
        if (!enabled) return
        posthog.reset()
    },

    screen(name: string) {
        if (!enabled) return
        posthog.capture('$pageview', { screen: name })
    },

    // Auth
    signupStarted() { capture('signup_started') },
    signupCompleted(role: 'captain' | 'crew') { capture('signup_completed', { role }) },

    // Vessel
    vesselCreated() { capture('vessel_created') },

    // Crew
    crewInviteSent() { capture('crew_invite_sent') },
    crewJoinAttempted() { capture('crew_join_attempted') },
    crewJoinApproved() { capture('crew_join_approved') },

    // Schedule
    scheduleWizardStarted() { capture('schedule_wizard_started') },
    scheduleGenerated() { capture('schedule_generated') },

    // Watch
    checkInTapped() { capture('check_in_tapped') },
    checkInCompleted() { capture('check_in_completed') },

    // Subscription
    paywallViewed() { capture('paywall_viewed') },
    subscriptionPurchased(plan: string) { capture('subscription_purchased', { plan }) },
    subscriptionRestored() { capture('subscription_restored') },
}

function capture(event: string, props?: Record<string, unknown>) {
    if (!enabled) return
    posthog.capture(event, props)
}
