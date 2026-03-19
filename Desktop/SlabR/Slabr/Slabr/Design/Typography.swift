import SwiftUI

extension Font {
    static let heroNumber: Font = .system(size: 34, weight: .bold, design: .default)
    static let sectionHeader: Font = .system(size: 22, weight: .semibold)
    static let cardTitle: Font = .body.weight(.semibold)
    static let cardMeta: Font = .subheadline
    static let captionMedium: Font = .caption.weight(.medium)
    static let metricNumber: Font = .system(size: 28, weight: .semibold)
    static let metricLabel: Font = .caption
    static let tabLabel: Font = .system(size: 10)
    static let trendIndicator: Font = .system(size: 15, weight: .semibold)
}

extension Text {
    func heroNumber() -> Text {
        self.font(.heroNumber)
    }

    func sectionHeader() -> Text {
        self.font(.sectionHeader)
    }

    func cardTitle() -> Text {
        self.font(.cardTitle)
    }

    func cardMeta() -> Text {
        self.font(.cardMeta)
    }

    func captionMedium() -> Text {
        self.font(.captionMedium)
    }
}
