import SwiftUI

/// Displays the auto-detected eBay category with an option to change it.
/// Shows the category name and full ancestry path. A "Change" button opens a
/// searchable sheet for browsing alternative categories via the Taxonomy API.
struct CategorySelector: View {
    @Binding var selectedCategory: EbayCategory?
    let suggestedCategory: EbayCategory?
    @State private var showPicker = false
    @State private var searchText = ""
    @State private var searchResults: [EbayCategory] = []
    @State private var isSearching = false
    @State private var searchTask: Task<Void, Never>?

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            if let category = selectedCategory ?? suggestedCategory {
                categoryRow(category)
            } else {
                loadingIndicator
            }
        }
        .sheet(isPresented: $showPicker) {
            categoryPickerSheet
        }
    }

    // MARK: - Subviews

    private func categoryRow(_ category: EbayCategory) -> some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(category.name)
                    .font(.cardTitle)
                    .foregroundColor(.labelPrimary)
                Text(category.parentPath)
                    .font(.captionMedium)
                    .foregroundColor(.labelSecondary)
            }
            Spacer()
            Button("Change") { showPicker = true }
                .font(.captionMedium)
                .foregroundColor(.brandAccent)
        }
    }

    private var loadingIndicator: some View {
        HStack {
            ProgressView()
            Text("Detecting category...")
                .font(.cardMeta)
                .foregroundColor(.labelSecondary)
                .padding(.leading, Spacing.sm)
        }
        .frame(maxWidth: .infinity, alignment: .center)
    }

    private var categoryPickerSheet: some View {
        NavigationStack {
            List {
                if isSearching {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                    .listRowBackground(Color.cardSurface)
                } else if searchResults.isEmpty && !searchText.isEmpty {
                    Text("No categories found")
                        .font(.cardMeta)
                        .foregroundColor(.labelSecondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .listRowBackground(Color.cardSurface)
                } else {
                    ForEach(searchResults) { category in
                        Button {
                            selectedCategory = category
                            showPicker = false
                        } label: {
                            VStack(alignment: .leading, spacing: Spacing.xs) {
                                Text(category.name)
                                    .font(.cardTitle)
                                    .foregroundColor(.labelPrimary)
                                Text(category.parentPath)
                                    .font(.caption)
                                    .foregroundColor(.labelSecondary)
                            }
                        }
                        .listRowBackground(Color.cardSurface)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Color.appBackground)
            .searchable(text: $searchText, prompt: "Search eBay categories")
            .onChange(of: searchText) { _ in
                searchCategories()
            }
            .navigationTitle("eBay Category")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { showPicker = false }
                }
            }
        }
    }

    // MARK: - Search

    private func searchCategories() {
        searchTask?.cancel()
        let query = searchText.trimmingCharacters(in: .whitespaces)
        guard !query.isEmpty else {
            searchResults = []
            isSearching = false
            return
        }

        isSearching = true
        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled else { return }

            do {
                let results = try await EbayCategoryService.suggestCategory(for: query)
                guard !Task.isCancelled else { return }
                searchResults = results
            } catch {
                guard !Task.isCancelled else { return }
                searchResults = []
            }
            isSearching = false
        }
    }
}
