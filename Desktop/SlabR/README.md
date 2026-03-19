# Slabr

iOS app for sports card sellers — scan PSA slabs, create eBay listings, and manage your inventory.

## Tech Stack

- **SwiftUI** — Declarative UI with MVVM architecture
- **Core Data** — Local persistence with encrypted store (`FileProtectionType.complete`)
- **Vision** — On-device OCR for PSA cert number extraction
- **Keychain** — Secure credential and userId storage
- **Sentry** — Crash reporting (Release builds only)
- **iOS 16.4+** — Minimum deployment target

## Getting Started

```bash
git clone <repo-url>
cd SlabR
open Slabr/Slabr.xcodeproj
```

Build and run on the iOS Simulator (iPhone 16 recommended). No external dependencies need manual setup — SPM packages resolve automatically on first build.

> **Note:** The xcconfig files in `Configuration/` are templates for API keys (eBay, OpenAI) that are not yet used in the app. You do not need to configure them to build and run.

## Architecture

### Tab Structure

| Tab | Screen | Description |
|-----|--------|-------------|
| Home | `DashboardView` | Activity overview (placeholder) |
| Listings | `ListingsView` | Draft and listed cards |
| + (FAB) | `EntryPointSheet` | New listing entry points |
| Analytics | `AnalyticsView` | Sales analytics (placeholder) |
| Settings | `SettingsView` | Listing defaults, shipping profiles |

### Directory Layout

```
Slabr/Slabr/
├── App/            SlabrApp, AppState, RootView, Log, SentrySetup
├── Components/     Reusable UI (TabBar, Cards, Common)
├── Design/         Colors, Typography, Spacing, Haptics
├── Models/         Data types, enums, Core Data extensions
├── Persistence/    PersistenceController + Slabr.xcdatamodel
├── Screens/        Feature screens (PSAImport, ListingBuilder, Listings, Settings, etc.)
└── Services/       PSAService, EbayService, VisionService, AccessControl
```

### Key Patterns

- **Dependency Injection** — ViewModels accept service protocols (`PSAServiceProtocol`, `EbayServiceProtocol`) with production defaults. Tests inject mocks.
- **EnvironmentObject** — `AppState` (userId, tab state) injected from `RootView` via `.environmentObject()`.
- **Configure pattern** — ViewModels that need `NSManagedObjectContext` use `configure(context:userId:)` called from `onAppear`, since environment values aren't available at `@StateObject` init time.
- **Structured logging** — `os.Logger` via the `Log` enum, scoped by category (Keychain, CoreData, Settings, etc.).

## Services

| Service | Status | Description |
|---------|--------|-------------|
| `PSAService` | Implemented | OAuth auth + cert lookup against PSA API |
| `VisionService` | Implemented | On-device OCR with image downscaling |
| `EbayService` | **Mock** | Generates fake listing IDs. Real eBay API integration pending. |
| `AccessControl` | Defined | Tier gating for 9 features. `currentTier()` always returns `.free` — StoreKit 2 integration is TODO. |

## CI/CD

- **CI** (`.github/workflows/ci.yml`) — Runs on every PR to `main`: SwiftLint lint + Xcode build + 68 unit tests with code coverage.
- **TestFlight** (`.github/workflows/testflight.yml`) — Manual dispatch with confirmation gate. Requires code signing secrets (not yet configured).

## Testing

68 unit tests across 13 test files, organized one-file-per-type:

- **P0 (Critical):** AccessControl, Keychain, VisionService, URL encoding
- **P1 (Business Logic):** Price validation, title generation, EbayService, PSAImport state machine
- **P2 (CRUD):** ShippingProfiles, Listings, ListingDefaults, PersistenceController

See [docs/TESTING.md](docs/TESTING.md) for details.

## Documentation

- [Architecture & Technical Reference](docs/CLAUDE.md)
- [Data Flows](docs/DATA_FLOWS.md)
- [API Contracts](docs/API_CONTRACTS.md)
- [Error Catalog](docs/ERRORS.md)
- [Architecture Decisions](docs/DECISIONS.md)
- [Testing Guide](docs/TESTING.md)
- [Privacy Policy](docs/PRIVACY.md)
- [Repository Structure](docs/REPO_CONFIG.md)
