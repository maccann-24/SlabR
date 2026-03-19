import CoreData

extension CardRecord: Identifiable {}

extension CardRecord {
    /// Generates an eBay-style listing title from card metadata.
    /// Parts are ordered: year, brand, set, player, #cardNumber, PSA grade, parallel.
    /// Empty/nil parts are skipped. If the result exceeds 80 characters, it is truncated
    /// at the last space within the first 80 characters.
    var generatedListingTitle: String {
        var parts: [String] = []

        let y = Int(year)
        if y > 0 { parts.append("\(y)") }

        if let b = brand, !b.isEmpty { parts.append(b) }
        if let s = setName, !s.isEmpty { parts.append(s) }
        if let p = playerName, !p.isEmpty { parts.append(p) }

        if let cn = cardNumber, !cn.isEmpty { parts.append("#\(cn)") }

        if let g = grade, !g.isEmpty { parts.append("PSA \(g)") }

        if let par = parallel, !par.isEmpty { parts.append(par) }

        let full = parts.joined(separator: " ")

        guard full.count > 80 else { return full }

        let prefix = String(full.prefix(80))
        if let lastSpace = prefix.lastIndex(of: " ") {
            return String(prefix[prefix.startIndex..<lastSpace])
        }
        return prefix
    }
}
