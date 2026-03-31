import SwiftUI

struct SettingsView: View {
    @Bindable var vm: UsageViewModel

    var body: some View {
        Form {
            Section("Refresh") {
                Picker("Interval", selection: $vm.refreshInterval) {
                    Text("30 seconds").tag(TimeInterval(30))
                    Text("1 minute").tag(TimeInterval(60))
                    Text("2 minutes").tag(TimeInterval(120))
                    Text("5 minutes").tag(TimeInterval(300))
                }
            }

            Section("About") {
                LabeledContent("Version", value: vm.output?.version ?? "—")
                LabeledContent("Last Update", value: vm.output?.timestamp.prefix(19).replacingOccurrences(of: "T", with: " ") ?? "—")
            }
        }
        .formStyle(.grouped)
        .frame(width: 350, height: 200)
    }
}
