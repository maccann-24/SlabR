import SwiftUI

struct CustomTabBar: View {
    @Binding var selectedTab: AppState.Tab
    let onAddTapped: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        HStack(spacing: 0) {
            tabButton(.home, icon: "house.fill", label: "Home")
            tabButton(.listings, icon: "list.bullet", label: "Listings")

            // Center FAB
            AddFAB(onTap: onAddTapped)
                .offset(y: -8)

            tabButton(.analytics, icon: "chart.bar.fill", label: "Analytics")
            tabButton(.settings, icon: "gearshape.fill", label: "Settings")
        }
        .padding(.horizontal, Spacing.screenMargin)
        .padding(.vertical, Spacing.sm)
        .frame(height: 64)
        .background(Color.tabBarPill)
        .clipShape(Capsule())
        .padding(.horizontal, Spacing.screenMargin)
        .padding(.bottom, Spacing.tabBarBottom)
    }

    private func tabButton(_ tab: AppState.Tab, icon: String, label: String) -> some View {
        Button {
            HapticManager.shared.buttonTapped()
            selectedTab = tab
        } label: {
            VStack(spacing: Spacing.xs) {
                Image(systemName: icon)
                    .font(.system(size: 22))
                Text(label)
                    .font(.tabLabel)
            }
            .foregroundColor(selectedTab == tab ? .white : .neutral)
            .frame(maxWidth: .infinity)
        }
        .accessibilityLabel(label)
    }
}
