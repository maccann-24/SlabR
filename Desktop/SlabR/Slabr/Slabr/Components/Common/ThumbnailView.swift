import SwiftUI

struct ThumbnailView: View {
    let data: Data?
    let size: CGFloat

    @State private var image: UIImage?

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(width: size, height: size)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            } else {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.elevatedSurface)
                    .frame(width: size, height: size)
                    .overlay(
                        Image(systemName: "photo")
                            .foregroundColor(.labelSecondary)
                    )
            }
        }
        .onAppear { decode() }
        .onChange(of: data?.count) { _ in decode() }
    }

    private func decode() {
        guard let data else { image = nil; return }
        let capturedData = data
        Task.detached(priority: .userInitiated) {
            let decoded = UIImage(data: capturedData)
            await MainActor.run { image = decoded }
        }
    }
}
