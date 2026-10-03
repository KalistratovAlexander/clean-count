import ExpoModulesCore

public class BackupExclusionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BackupExclusion")

    // На iOS файлы не переносятся: исключение задаётся флагом на папке с базой.
    Function("getNoBackupDirectory") { () -> String? in
      return nil
    }

    Function("fileExists") { (path: String) -> Bool in
      return FileManager.default.fileExists(atPath: path)
    }

    Function("isExcludedFromBackup") { (path: String) -> Bool in
      let url = URL(fileURLWithPath: path)
      let values = try? url.resourceValues(forKeys: [.isExcludedFromBackupKey])
      return values?.isExcludedFromBackup ?? false
    }

    Function("setExcludedFromBackup") { (path: String, excluded: Bool) in
      try FileManager.default.createDirectory(atPath: path, withIntermediateDirectories: true)
      var url = URL(fileURLWithPath: path)
      var values = URLResourceValues()
      values.isExcludedFromBackup = excluded
      try url.setResourceValues(values)
    }

    Function("moveFile") { (from: String, to: String) in
      let fm = FileManager.default
      guard fm.fileExists(atPath: from) else { return }
      let target = URL(fileURLWithPath: to)
      try fm.createDirectory(at: target.deletingLastPathComponent(), withIntermediateDirectories: true)
      if fm.fileExists(atPath: to) {
        try fm.removeItem(at: target)
      }
      try fm.moveItem(at: URL(fileURLWithPath: from), to: target)
    }
  }
}
