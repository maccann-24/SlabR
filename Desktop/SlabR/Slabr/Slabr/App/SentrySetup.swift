import Foundation
import Sentry

/// Sentry crash reporting initialization. Disabled in DEBUG builds to avoid dev noise.
/// DSN is read from the `SENTRY_DSN` environment variable (falls back to a placeholder).
enum SentrySetup {
    /// Call once from `SlabrApp.init()`. Configures session tracking and a 20% traces sample rate.
    static func start() {
        SentrySDK.start { options in
            options.dsn = ProcessInfo.processInfo.environment["SENTRY_DSN"]
                ?? "https://placeholder@sentry.io/0"

            #if DEBUG
            options.enabled = false
            #endif

            options.tracesSampleRate = 0.2
            options.enableAutoSessionTracking = true
        }
    }
}
