import SwiftUI

/// Branded text field with elevatedSurface background and 16pt corner radius.
/// Replaces system `.roundedBorder` for a premium, on-brand appearance.
struct SlabRTextField: View {
    let placeholder: String
    @Binding var text: String
    var isSecure: Bool = false
    var contentType: UITextContentType? = nil
    var autocapitalization: TextInputAutocapitalization = .sentences
    var disableAutocorrection: Bool = false

    var body: some View {
        Group {
            if isSecure {
                SecureField(placeholder, text: $text)
                    .textContentType(contentType)
            } else {
                TextField(placeholder, text: $text)
                    .textContentType(contentType)
                    .autocorrectionDisabled(disableAutocorrection)
                    .textInputAutocapitalization(autocapitalization)
            }
        }
        .font(.cardTitle)
        .foregroundColor(.labelPrimary)
        .padding(Spacing.cardPadding)
        .background(Color.elevatedSurface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
