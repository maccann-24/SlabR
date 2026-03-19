import SwiftUI
import Charts

struct AnalyticsView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.managedObjectContext) private var context
    @StateObject private var viewModel = AnalyticsViewModel()
    @State private var showUpgradeSheet = false
    @State private var showShareSheet = false
    @State private var csvURL: URL?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                Text("Analytics")
                    .font(.sectionHeader)
                    .foregroundColor(.labelPrimary)
                    .padding(.horizontal, Spacing.screenMargin)

                if !viewModel.hasData {
                    EmptyState(
                        icon: "chart.bar.fill",
                        title: "No data yet",
                        message: "Import cards to see analytics.",
                        ctaTitle: "Import cards",
                        ctaAction: { appState.showEntryPointSheet = true }
                    )
                    .frame(maxWidth: .infinity)
                    .padding(.horizontal, Spacing.screenMargin)
                } else {
                    VStack(spacing: Spacing.cardGap) {
                        gradeDistributionChart
                        topBrandsChart
                        priceByGradeChart
                        sourceChart
                        statusChart
                        exportButton
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
        .sheet(isPresented: $showUpgradeSheet) {
            UpgradeSheet(feature: .analyticsExport)
                .presentationDetents([.medium])
        }
        .sheet(isPresented: $showShareSheet) {
            if let url = csvURL {
                ActivityShareSheet(items: [url])
            }
        }
    }

    // MARK: - Grade Distribution

    private var gradeDistributionChart: some View {
        ChartCard(title: "Grade Distribution") {
            Chart(viewModel.gradeDistribution) { item in
                BarMark(
                    x: .value("Count", item.count),
                    y: .value("Grade", item.label)
                )
                .foregroundStyle(Color.brandAccent)
                .cornerRadius(4)
            }
            .frame(height: CGFloat(max(viewModel.gradeDistribution.count, 1)) * 36)
        }
    }

    // MARK: - Top Brands

    private var topBrandsChart: some View {
        ChartCard(title: "Top Brands") {
            Chart(viewModel.topBrands) { item in
                BarMark(
                    x: .value("Count", item.count),
                    y: .value("Brand", item.label)
                )
                .foregroundStyle(Color.brandAccent)
                .cornerRadius(4)
            }
            .frame(height: CGFloat(max(viewModel.topBrands.count, 1)) * 36)
        }
    }

    // MARK: - Price by Grade

    private var priceByGradeChart: some View {
        ChartCard(title: "Avg Price by Grade") {
            Chart(viewModel.priceByGrade) { item in
                BarMark(
                    x: .value("Grade", item.label),
                    y: .value("Price", NSDecimalNumber(decimal: item.avgPrice).doubleValue)
                )
                .foregroundStyle(Color.brandAccent)
                .cornerRadius(4)
            }
            .frame(height: 200)
        }
    }

    // MARK: - Source Breakdown

    private var sourceChart: some View {
        ChartCard(title: "Import Source") {
            Chart(viewModel.sourceBreakdown) { item in
                BarMark(
                    x: .value("Count", item.count),
                    y: .value("Source", item.label)
                )
                .foregroundStyle(item.label == "PSA Import" ? Color.tilePSA : Color.tileCamera)
                .cornerRadius(4)
            }
            .frame(height: CGFloat(max(viewModel.sourceBreakdown.count, 1)) * 36)
        }
    }

    // MARK: - Status Breakdown

    private var statusChart: some View {
        ChartCard(title: "Listing Status") {
            Chart(viewModel.statusBreakdown) { item in
                BarMark(
                    x: .value("Count", item.count),
                    y: .value("Status", item.label)
                )
                .foregroundStyle(item.label == "Active" ? Color.brandAccent : Color.neutral)
                .cornerRadius(4)
            }
            .frame(height: CGFloat(max(viewModel.statusBreakdown.count, 1)) * 36)
        }
    }

    // MARK: - Export

    private var exportButton: some View {
        Button {
            if AccessControl.hasAccess(userId: appState.userId, feature: .analyticsExport) {
                if let url = viewModel.exportCSV() {
                    csvURL = url
                    showShareSheet = true
                }
            } else {
                showUpgradeSheet = true
            }
        } label: {
            Label("Export Listings", systemImage: "square.and.arrow.up")
                .font(.cardTitle)
                .foregroundColor(.brandAccent)
                .frame(maxWidth: .infinity)
                .padding(Spacing.cardPadding)
                .background(Color.cardSurface)
                .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }
}
