import XCTest

final class ScreenshotTests: XCTestCase {
    let app = XCUIApplication()

    override func setUp() {
        continueAfterFailure = false
        app.launchArguments = ["--screenshot-mode"]
        app.launch()
    }

    func test01Dashboard() {
        // Dashboard is default tab — wait for data to load
        let dashboardText = app.staticTexts["Dashboard"]
        _ = dashboardText.waitForExistence(timeout: 5)
        sleep(1)
        takeScreenshot(name: "01_Dashboard")
    }

    func test02Listings() {
        let listingsTab = app.buttons["Listings"]
        if listingsTab.waitForExistence(timeout: 3) {
            listingsTab.tap()
            sleep(1)
        }
        takeScreenshot(name: "02_Listings")
    }

    func test03Analytics() {
        let analyticsTab = app.buttons["Analytics"]
        if analyticsTab.waitForExistence(timeout: 3) {
            analyticsTab.tap()
            sleep(1)
        }
        takeScreenshot(name: "03_Analytics")
    }

    func test04Settings() {
        let settingsTab = app.buttons["Settings"]
        if settingsTab.waitForExistence(timeout: 3) {
            settingsTab.tap()
            sleep(1)
        }
        takeScreenshot(name: "04_Settings")
    }

    // MARK: - Helper

    private func takeScreenshot(name: String) {
        let screenshot = app.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
