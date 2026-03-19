import Foundation
import os

/// Centralized loggers scoped by subsystem + category.
/// Use the appropriate logger for structured, filterable diagnostics
/// instead of `print()`.
enum Log {
    private static let subsystem = Bundle.main.bundleIdentifier ?? "com.slabr"

    static let keychain   = Logger(subsystem: subsystem, category: "Keychain")
    static let coreData   = Logger(subsystem: subsystem, category: "CoreData")
    static let psa        = Logger(subsystem: subsystem, category: "PSAService")
    static let vision     = Logger(subsystem: subsystem, category: "VisionService")
    static let listings   = Logger(subsystem: subsystem, category: "Listings")
    static let settings   = Logger(subsystem: subsystem, category: "Settings")
    static let builder    = Logger(subsystem: subsystem, category: "ListingBuilder")
    static let importing  = Logger(subsystem: subsystem, category: "PSAImport")
    static let camera     = Logger(subsystem: subsystem, category: "Camera")
    static let onboarding = Logger(subsystem: subsystem, category: "Onboarding")
}
