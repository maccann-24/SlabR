import Foundation

/// Import record lifecycle status. Raw values are stored in the Core Data `status` attribute.
/// Use `.rawValue` when writing to Core Data and `RecordStatus(rawValue:)` when reading.
enum RecordStatus: String {
    case draft
    case listed
}
