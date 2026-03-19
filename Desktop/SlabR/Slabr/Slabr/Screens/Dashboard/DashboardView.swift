import SwiftUI

struct DashboardView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                Text("Dashboard")
                    .font(.sectionHeader)
                    .foregroundColor(.labelPrimary)
                    .padding(.horizontal, Spacing.screenMargin)

                EmptyState(
                    icon: "chart.line.uptrend.xyaxis",
                    title: "No activity yet",
                    message: "Import your first PSA scan or capture a raw card to get started."
                )
                .frame(maxWidth: .infinity)
            }
            .padding(.top, Spacing.md)
        }
        .background(Color.appBackground)
        .toolbar(.hidden, for: .navigationBar)
    }
}
