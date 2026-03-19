import SwiftUI

struct AnalyticsView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                Text("Analytics")
                    .font(.sectionHeader)
                    .foregroundColor(.labelPrimary)
                    .padding(.horizontal, Spacing.screenMargin)

                EmptyState(
                    icon: "chart.bar.fill",
                    title: "No data yet",
                    message: "Analytics will populate once you start selling."
                )
                .frame(maxWidth: .infinity)
            }
            .padding(.top, Spacing.md)
        }
        .background(Color.appBackground)
        .toolbar(.hidden, for: .navigationBar)
    }
}
