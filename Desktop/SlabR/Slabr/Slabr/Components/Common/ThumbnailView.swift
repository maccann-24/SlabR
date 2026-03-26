import ImageIO
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
        let targetPixels = size * UIScreen.main.scale
        Task.detached(priority: .utility) {
            let options: [CFString: Any] = [
                kCGImageSourceCreateThumbnailFromImageAlways: true,
                kCGImageSourceThumbnailMaxPixelSize: targetPixels,
                kCGImageSourceCreateThumbnailWithTransform: true
            ]
            guard let source = CGImageSourceCreateWithData(capturedData as CFData, nil),
                  let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
                await MainActor.run { self.image = nil }
                return
            }
            let decoded = UIImage(cgImage: cgImage)
            await MainActor.run { self.image = decoded }
        }
    }
}
