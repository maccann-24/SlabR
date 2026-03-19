import SwiftUI

struct ShippingProfilesView: View {
    @ObservedObject var viewModel: ShippingProfilesViewModel
    @Environment(\.dismiss) private var dismiss
    var onDefaultChanged: ((UUID?, String) -> Void)?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                header

                if viewModel.profiles.isEmpty {
                    EmptyState(
                        icon: "shippingbox",
                        title: "No shipping profiles",
                        message: "Add a profile to set default shipping options for your listings."
                    )
                    .padding(.top, Spacing.xl)
                } else {
                    VStack(spacing: Spacing.cardGap) {
                        ForEach(viewModel.profiles) { profile in
                            profileRow(profile)
                        }
                    }
                    .padding(.horizontal, Spacing.screenMargin)
                }

                PrimaryButton("Add profile") {
                    viewModel.resetForm()
                    viewModel.showAddSheet = true
                }
                .padding(.horizontal, Spacing.screenMargin)
            }
            .padding(.top, Spacing.md)
        }
        .background(Color.appBackground)
        .toolbar(.hidden, for: .navigationBar)
        .sheet(isPresented: $viewModel.showAddSheet) {
            profileFormSheet
                .presentationDetents([.medium])
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            Button(action: { dismiss() }) {
                Image(systemName: "chevron.left")
                    .foregroundColor(.labelPrimary)
                    .font(.body.weight(.semibold))
            }
            Spacer()
            Text("Shipping profiles")
                .font(.sectionHeader)
                .foregroundColor(.labelPrimary)
            Spacer()
            Image(systemName: "chevron.left")
                .foregroundColor(.clear)
                .font(.body.weight(.semibold))
        }
        .padding(.horizontal, Spacing.screenMargin)
    }

    // MARK: - Profile Row

    private func profileRow(_ profile: ShippingProfile) -> some View {
        Button {
            viewModel.loadFormForEdit(profile)
            viewModel.showAddSheet = true
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    HStack(spacing: Spacing.sm) {
                        Text(profile.name)
                            .font(.cardTitle)
                            .foregroundColor(.labelPrimary)
                        if profile.isDefault {
                            Text("DEFAULT")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.brandAccent)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.brandAccent.opacity(0.15))
                                .clipShape(Capsule())
                        }
                    }
                    Text("\(profile.service) \u{2022} \(profile.handlingDays)d handling \u{2022} \(profile.buyerPays ? "Buyer pays" : "Free shipping")")
                        .font(.cardMeta)
                        .foregroundColor(.labelSecondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundColor(.labelSecondary)
                    .font(.caption)
            }
            .padding(Spacing.cardPadding)
            .background(Color.cardSurface)
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
        .contextMenu {
            Button {
                viewModel.setDefault(profile)
                notifyDefaultChanged()
            } label: {
                Label("Set as default", systemImage: "checkmark.circle")
            }
            Button(role: .destructive) {
                viewModel.deleteProfile(profile)
                notifyDefaultChanged()
            } label: {
                Label("Delete", systemImage: "trash")
            }
        }
    }

    // MARK: - Form Sheet

    private var profileFormSheet: some View {
        VStack(spacing: Spacing.lg) {
            DragHandle()

            Text(viewModel.editingProfile == nil ? "New profile" : "Edit profile")
                .font(.sectionHeader)
                .foregroundColor(.labelPrimary)

            VStack(spacing: Spacing.md) {
                formField("Name") {
                    TextField("e.g. Standard Shipping", text: $viewModel.formName)
                        .font(.cardTitle)
                        .foregroundColor(.labelPrimary)
                }

                formField("Service") {
                    HStack(spacing: Spacing.sm) {
                        ForEach(ShippingProfilesViewModel.services, id: \.self) { svc in
                            FilterChip(title: svc, isSelected: viewModel.formService == svc) {
                                viewModel.formService = svc
                            }
                        }
                    }
                }

                formField("Handling time") {
                    Stepper("\(viewModel.formHandlingDays) day\(viewModel.formHandlingDays == 1 ? "" : "s")",
                            value: $viewModel.formHandlingDays, in: 1...5)
                        .font(.cardTitle)
                        .foregroundColor(.labelPrimary)
                }

                Toggle("Buyer pays shipping", isOn: $viewModel.formBuyerPays)
                    .font(.cardTitle)
                    .foregroundColor(.labelPrimary)
                    .tint(.brandAccent)
                    .padding(.horizontal, Spacing.cardPadding)

                Toggle("Set as default", isOn: $viewModel.formIsDefault)
                    .font(.cardTitle)
                    .foregroundColor(.labelPrimary)
                    .tint(.brandAccent)
                    .padding(.horizontal, Spacing.cardPadding)
            }

            Spacer()

            HStack(spacing: Spacing.md) {
                if viewModel.editingProfile != nil {
                    Button {
                        if let profile = viewModel.editingProfile {
                            viewModel.deleteProfile(profile)
                            notifyDefaultChanged()
                        }
                        viewModel.showAddSheet = false
                    } label: {
                        Text("Delete")
                            .font(.cardTitle)
                            .foregroundColor(.negative)
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                            .background(Color.negative.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                    }
                }
                PrimaryButton("Save", isEnabled: !viewModel.formName.trimmingCharacters(in: .whitespaces).isEmpty) {
                    viewModel.saveProfile()
                    notifyDefaultChanged()
                    viewModel.showAddSheet = false
                }
            }
            .padding(.horizontal, Spacing.screenMargin)
        }
        .padding(.top, Spacing.md)
        .padding(.bottom, Spacing.lg)
        .background(Color.appBackground)
    }

    private func formField<Content: View>(_ label: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text(label)
                .font(.captionMedium)
                .foregroundColor(.labelSecondary)
                .textCase(.uppercase)
            content()
        }
        .padding(.horizontal, Spacing.cardPadding)
    }

    private func notifyDefaultChanged() {
        let def = viewModel.defaultProfile
        onDefaultChanged?(def?.id, def?.name ?? "None")
    }
}
