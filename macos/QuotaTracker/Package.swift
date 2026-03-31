// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "QuotaTracker",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(
            name: "QuotaTracker",
            path: "Sources",
            exclude: ["Resources/Info.plist"],
            resources: [
                .process("Resources/Assets.xcassets"),
            ]
        ),
    ]
)
