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
                Text("Dashboard")
                    .font(.sectionHeader)
                    .foregroundColor(.labelPrimary)
                    .padding(.horizontal, Spacing.screenMargin)

                if viewModel.totalCards == 0 {
                    EmptyState(
                        icon: "chart.line.uptrend.xyaxis",
                        title: "No cards yet",
                        message: "Scan a slab to build your inventory."
                    )
                    .frame(maxWidth: .infinity)
                } else {
                    VStack(spacing: Spacing.lg) {
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

    // MARK: - Stat Grid

    private var statGrid: some View {
        LazyVGrid(columns: columns, spacing: Spacing.cardGap) {
            StatCard(
                value: "\(viewModel.totalCards)",
                label: "Inventory",
                tileColor: .tilePSA
            )
            StatCard(
                value: viewModel.formattedListedValue,
                label: "Listed Value",
                tileColor: .tileListings
            )
            StatCard(
                value: "\(viewModel.draftCount)",
                label: "Drafts",
                tileColor: .tileCamera
            )
            StatCard(
                value: "\(viewModel.activeCount)",
                label: "Active",
                tileColor: .tileAnalytics
            )
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
}
