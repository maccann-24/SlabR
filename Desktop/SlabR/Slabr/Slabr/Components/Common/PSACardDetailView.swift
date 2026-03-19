import SwiftUI

struct PSACardDetailView: View {
    let card: PSACard

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Text(card.playerName)
                    .font(.cardTitle)
                    .foregroundColor(.labelPrimary)

                Spacer()

                if !card.grade.isEmpty {
                    Text(card.grade)
                        .font(.captionMedium)
                        .foregroundColor(.white)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xs)
                        .background(Color.brandAccent)
                        .clipShape(Capsule())
                }
            }

            DetailRow(label: "Year", value: card.year)
            DetailRow(label: "Brand", value: card.brand)
            DetailRow(label: "Set", value: card.setName)
            DetailRow(label: "Card number", value: card.cardNumber)

            if let parallel = card.parallel, !parallel.isEmpty {
                DetailRow(label: "Parallel", value: parallel)
            }

            if !card.grade.isEmpty {
                let gradeValue = card.gradeDescription.isEmpty
                    ? card.grade
                    : "\(card.grade) — \(card.gradeDescription)"
                DetailRow(label: "Grade", value: gradeValue)
            }

            if let pop = card.population {
                DetailRow(label: "Population", value: "\(pop)")
            }

            if card.isRookie {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "star.fill")
                        .foregroundColor(.brandAccent)
                        .font(.caption)
                    Text("Rookie")
                        .font(.captionMedium)
                        .foregroundColor(.brandAccent)
                }
            }
        }
        .padding(Spacing.cardPadding)
        .background(Color.cardSurface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
