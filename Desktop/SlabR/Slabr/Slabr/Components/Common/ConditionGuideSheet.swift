import SwiftUI

/// Reference sheet showing visual descriptions of each card condition grade.
/// Uses hobby-native terminology (corner wear, edge whitening, surface creases).
/// Starter+ tier only, toggleable in Settings.
struct ConditionGuideSheet: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: Spacing.lg) {
            DragHandle()

            Text("Condition Guide")
                .font(.sectionHeader)
                .foregroundColor(.labelPrimary)

            ScrollView {
                VStack(spacing: Spacing.cardGap) {
                    gradeRow("Gem Mint", desc: "Flawless. No visible defects under magnification. Perfect centering, sharp corners, pristine surface.")
                    gradeRow("NM-MT", desc: "Nearly perfect. Minor centering shift allowed. Corners sharp, edges clean, surface free of marks.")
                    gradeRow("NM", desc: "Slight corner wear visible to naked eye. Clean surface, minor edge whitening acceptable.")
                    gradeRow("EX-MT", desc: "Light corner wear on 2-3 corners. Minor edge whitening. Surface may have faint scratches.")
                    gradeRow("EX", desc: "Visible corner wear. Edge whitening along borders. Surface may show light creases or scratches.")
                    gradeRow("VG-EX", desc: "Moderate corner wear. Noticeable edge wear. Light creasing acceptable. Surface may show handling marks.")
                    gradeRow("VG", desc: "Rounded corners. Moderate edge wear and whitening. Creases or surface wear visible but card is intact.")
                    gradeRow("Good", desc: "Heavy corner rounding. Significant edge wear. Creases, staining, or surface damage present.")
                    gradeRow("Poor", desc: "Major defects. Heavy creasing, tears, writing, or missing pieces. Card is identifiable but damaged.")
                }
                .padding(.horizontal, Spacing.screenMargin)
            }

            PrimaryButton("Got it") { dismiss() }
                .padding(.horizontal, Spacing.screenMargin)
                .padding(.bottom, Spacing.md)
        }
        .padding(.top, Spacing.md)
        .background(Color.appBackground)
    }

    private func gradeRow(_ grade: String, desc: String) -> some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text(grade)
                .font(.cardTitle)
                .foregroundColor(.labelPrimary)
            Text(desc)
                .font(.cardMeta)
                .foregroundColor(.labelSecondary)
                .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: Spacing.sm) {
                checkItem("Corners")
                checkItem("Edges")
                checkItem("Surface")
                checkItem("Centering")
            }
        }
        .padding(Spacing.cardPadding)
        .background(Color.cardSurface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func checkItem(_ label: String) -> some View {
        HStack(spacing: Spacing.xs) {
            Image(systemName: "eye")
                .font(.caption2)
                .foregroundColor(.labelTertiary)
            Text(label)
                .font(.caption)
                .foregroundColor(.labelTertiary)
        }
    }
}
