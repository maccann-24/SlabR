import Foundation
import Sentry

/// Sentry crash reporting initialization. Disabled in DEBUG builds to avoid dev noise.
/// DSN is read from Info.plist (injected via xcconfig/build settings at build time).
enum SentrySetup {
    /// Call once from `SlabrApp.init()`. Configures session tracking and a 20% traces sample rate.
    static func start() {
        guard let dsn = AppEnvironment.sentryDSN,
              !dsn.isEmpty else {
            Log.settings.info("Sentry DSN not configured — crash reporting disabled")
            return
        }

        SentrySDK.start { options in
            options.dsn = dsn

            #if DEBUG
            options.enabled = false
            #endif

            options.tracesSampleRate = 0.2
            options.enableAutoSessionTracking = true
        }
    }
}
