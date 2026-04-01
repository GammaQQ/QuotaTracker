import Foundation
import os

private let log = Logger(subsystem: "com.quotatracker", category: "CoreRunner")

/// Spawns the `quotatracker` CLI binary and decodes its JSON output.
actor CoreRunner {
    private let binaryPath: String

    init(binaryPath: String? = nil) {
        let path = binaryPath ?? Self.findBinary()
        self.binaryPath = path
        log.info("Binary path: \(path)")
    }

    /// Run the CLI and return parsed output.
    func fetch() async throws -> UsageOutput {
        log.info("Fetching...")
        let data = try await run()
        log.info("Got \(data.count) bytes, decoding...")
        do {
            let output = try JSONDecoder().decode(UsageOutput.self, from: data)
            log.info("Decoded OK")
            return output
        } catch {
            log.error("Decode failed: \(error)")
            throw error
        }
    }

    // MARK: - Private

    private func run() async throws -> Data {
        let path = self.binaryPath
        // Run entirely off the cooperative pool to avoid blocking Swift concurrency threads.
        return try await Task.detached {
            let process = Process()
            let stdoutPipe = Pipe()
            let stderrPipe = Pipe()
            let stdinPipe = Pipe()

            process.executableURL = URL(fileURLWithPath: path)
            process.standardOutput = stdoutPipe
            process.standardError = stderrPipe
            process.standardInput = stdinPipe
            // Ensure the child has HOME and PATH so it can find credentials and tools.
            process.environment = ProcessInfo.processInfo.environment

            // Close stdin immediately so the child doesn't block waiting for input.
            stdinPipe.fileHandleForWriting.closeFile()

            log.info("Launching: \(path)")
            try process.run()
            log.info("Process launched, pid=\(process.processIdentifier)")

            // Read stdout fully (this blocks until the child closes its end).
            let outData = stdoutPipe.fileHandleForReading.readDataToEndOfFile()
            let errData = stderrPipe.fileHandleForReading.readDataToEndOfFile()
            process.waitUntilExit()

            let status = process.terminationStatus
            log.info("Process exited, status=\(status), stdout=\(outData.count)B, stderr=\(errData.count)B")

            if status != 0 {
                let errText = String(data: errData, encoding: .utf8) ?? "unknown error"
                throw CoreRunnerError.nonZeroExit(Int(status), errText)
            }

            return outData
        }.value
    }

    private static func findBinary() -> String {
        // 1. Bundled binary inside .app bundle (Contents/Resources/bin/quotatracker)
        if let bundled = Bundle.main.resourceURL?
            .appendingPathComponent("bin")
            .appendingPathComponent("quotatracker") {
            if FileManager.default.isExecutableFile(atPath: bundled.path) {
                return bundled.path
            }
        }

        // 2. Next to the executable (Contents/MacOS/../Resources/bin/)
        if let execURL = Bundle.main.executableURL {
            let siblingBin = execURL
                .deletingLastPathComponent()        // Contents/MacOS/
                .deletingLastPathComponent()        // Contents/
                .appendingPathComponent("Resources")
                .appendingPathComponent("bin")
                .appendingPathComponent("quotatracker")
            if FileManager.default.isExecutableFile(atPath: siblingBin.path) {
                return siblingBin.path
            }
        }

        // 3. Common install paths
        let candidates = [
            "\(NSHomeDirectory())/.local/bin/quotatracker",
            "/usr/local/bin/quotatracker",
        ]
        for path in candidates {
            if FileManager.default.isExecutableFile(atPath: path) {
                return path
            }
        }
        return candidates[0]
    }
}

enum CoreRunnerError: LocalizedError {
    case nonZeroExit(Int, String)

    var errorDescription: String? {
        switch self {
        case .nonZeroExit(let code, let msg):
            "quotatracker exited with code \(code): \(msg)"
        }
    }
}
