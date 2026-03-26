import SwiftUI

/// Horizontal scrollable chip selector for card condition grades.
/// Condition is always selected manually by the seller — AI never suggests condition.
/// No default selection — seller must choose before posting.
struct ConditionSelector: View {
    @Binding var selectedCondition: CardCondition?
    var showGuideButton: Bool = false
    var onGuideRequested: (() -> Void)? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            conditionHeader
            conditionChips
            conditionWarning
        }
    }

    // MARK: - Subviews

    private var conditionHeader: some View {
        HStack {
            Text("Condition")
                .font(.cardTitle)
                .foregroundColor(.labelPrimary)
            if showGuideButton {
                Button {
                    onGuideRequested?()
                } label: {
                    Image(systemName: "questionmark.circle")
                        .foregroundColor(.brandAccent)
                        .font(.body)
                }
                .accessibilityLabel("Condition guide")
                .accessibilityHint("Shows descriptions of each condition grade")
            }
            Spacer()
        }
    }

    private var conditionChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Spacing.sm) {
                ForEach(CardCondition.allCases) { condition in
                    FilterChip(
                        title: condition.shortName,
                        isSelected: selectedCondition == condition
                    ) {
                        selectedCondition = condition
                    }
                    .accessibilityLabel(condition.rawValue)
                    .accessibilityAddTraits(selectedCondition == condition ? .isSelected : [])
                }
            }
            .padding(.horizontal, Spacing.xs)
        }
    }

    @ViewBuilder
    private var conditionWarning: some View {
        if selectedCondition == nil {
            Text("Select condition before posting")
                .font(.caption)
                .foregroundColor(.negative)
        }
    }
}
