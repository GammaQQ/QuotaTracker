import SwiftUI
import AppKit

final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        // Hide dock icon — pure menu bar app
        NSApp.setActivationPolicy(.accessory)
    }
}

@main
struct QuotaTrackerApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var delegate
    @State private var vm: UsageViewModel = {
        let vm = UsageViewModel()
        vm.startPolling()
        return vm
    }()

    var body: some Scene {
        MenuBarExtra {
            DashboardView(vm: vm)
                .frame(width: 420, height: 600)
        } label: {
            Text(vm.menuBarTitle)
                .monospacedDigit()
        }
        .menuBarExtraStyle(.window)

        Settings {
            SettingsView(vm: vm)
        }
    }
}
