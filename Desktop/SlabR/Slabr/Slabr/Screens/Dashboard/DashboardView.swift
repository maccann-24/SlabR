import SwiftUI

struct DashboardView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.managedObjectContext) private var context
    @StateObject private var viewModel = DashboardViewModel()

    private let columns = [
        GridItem(.flexible(), spacing: Spacing.cardGap),
        GridItem(.flexible(), spacing: Spacing.cardGap)
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(greeting)
                        .font(.caption)
                        .foregroundColor(.labelSecondary)
                    Text("Dashboard")
                        .font(.sectionHeader)
                        .foregroundColor(.labelPrimary)
                }
                .padding(.horizontal, Spacing.screenMargin)

                if viewModel.totalCards == 0 {
                    EmptyState(
                        icon: "chart.line.uptrend.xyaxis",
                        title: "No cards yet",
                        message: "Scan a slab to build your inventory.",
                        ctaTitle: "Scan your first slab",
                        ctaAction: { appState.showEntryPointSheet = true }
                    )
                    .frame(maxWidth: .infinity)
                    .padding(.horizontal, Spacing.screenMargin)
                } else {
                    VStack(spacing: Spacing.lg) {
                        heroSection
                        statGrid
                        recentActivitySection
                    }
                    .padding(.horizontal, Spacing.screenMargin)
                }
            }
            .padding(.top, Spacing.md)
        }
        .background(Color.appBackground)
        .toolbar(.hidden, for: .navigationBar)
        .onAppear {
            viewModel.configure(context: context, userId: appState.userId)
            viewModel.load()
        }
    }

    // MARK: - Hero Section

    private var heroSection: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text(viewModel.formattedListedValue)
                .font(.heroNumber)
                .foregroundColor(.labelPrimary)
            Text(viewModel.activeCount > 0 ? "Listed value · \(viewModel.activeCount) active" : "Listed value")
                .font(.metricLabel)
                .foregroundColor(.labelSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spacing.cardPadding)
        .background(Color.cardSurface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Stat Grid

    private var statGrid: some View {
        LazyVGrid(columns: columns, spacing: Spacing.cardGap) {
            StatCard(value: "\(viewModel.totalCards)", label: "Inventory")
            StatCard(value: "\(viewModel.draftCount)", label: "Drafts")
            StatCard(value: "\(viewModel.activeCount)", label: "Active")
            StatCard(value: "\(viewModel.gradedCount)", label: "Graded")
        }
    }

    // MARK: - Recent Activity

    private var recentActivitySection: some View {
        VStack(alignment: .leading, spacing: Spacing.cardGap) {
            Text("Recent Activity")
                .font(.captionMedium)
                .foregroundColor(.labelSecondary)
                .textCase(.uppercase)

            if viewModel.recentActivity.isEmpty {
                Text("No recent activity")
                    .font(.cardMeta)
                    .foregroundColor(.labelSecondary)
            } else {
                ForEach(viewModel.recentActivity) { listing in
                    recentRow(listing)
                }
            }
        }
    }

    private func recentRow(_ listing: ListingRecord) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(listing.card?.playerName ?? "Unknown")
                    .font(.cardTitle)
                    .foregroundColor(.labelPrimary)
                    .lineLimit(1)

                if let grade = listing.card?.grade, !grade.isEmpty {
                    Text("PSA \(grade)")
                        .font(.cardMeta)
                        .foregroundColor(.labelSecondary)
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: Spacing.xs) {
                Text(listing.status == RecordStatus.listed.rawValue ? "listed" : "draft")
                    .font(.captionMedium)
                    .foregroundColor(listing.status == RecordStatus.listed.rawValue ? .brandAccent : .labelSecondary)

                if let date = listing.date {
                    Text(date, style: .relative)
                        .font(.caption)
                        .foregroundColor(.labelTertiary)
                }
            }
        }
        .padding(Spacing.cardPadding)
        .background(Color.cardSurface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Greeting

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12: return "Good morning"
        case 12..<17: return "Good afternoon"
        default: return "Good evening"
        }
    }
}
