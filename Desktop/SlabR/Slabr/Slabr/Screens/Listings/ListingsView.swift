import SwiftUI

struct ListingsView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.managedObjectContext) private var context
    @StateObject private var viewModel = ListingsViewModel()
    @State private var selectedRecord: ListingRecord?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                Text("Listings")
                    .font(.sectionHeader)
                    .foregroundColor(.labelPrimary)
                    .padding(.horizontal, Spacing.screenMargin)

                if viewModel.drafts.isEmpty && viewModel.listed.isEmpty {
                    EmptyState(
                        icon: "list.bullet.rectangle",
                        title: "No listings yet",
                        message: "Your active and draft listings will appear here.",
                        ctaTitle: "Import a card",
                        ctaAction: { appState.showEntryPointSheet = true }
                    )
                    .frame(maxWidth: .infinity)
                    .padding(.horizontal, Spacing.screenMargin)
                } else {
                    VStack(spacing: Spacing.cardGap) {
                        if !viewModel.drafts.isEmpty {
                            sectionHeader("Drafts")
                            ForEach(viewModel.drafts) { record in
                                Button {
                                    selectedRecord = record
                                } label: {
                                    ListingRow(listing: record, isDraft: true)
                                }
                                .buttonStyle(.plain)
                            }
                        }

                        if !viewModel.listed.isEmpty {
                            sectionHeader("Listed")
                            ForEach(viewModel.listed) { record in
                                ListingRow(listing: record, isDraft: false)
                            }
                        }
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
        .sheet(item: $selectedRecord) { record in
            ListingBuilderView(listing: record)
                .environment(\.managedObjectContext, context)
                .presentationDetents([.large])
                .onDisappear { viewModel.load() }
        }
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.captionMedium)
            .foregroundColor(.labelSecondary)
            .textCase(.uppercase)
    }
}
