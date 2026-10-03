package expo.modules.backupexclusion

import android.content.Context
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

/**
 * Android не позволяет исключить отдельный файл из Auto Backup во время работы:
 * правила бэкапа задаются в манифесте. Зато папку noBackupFilesDir система не
 * копирует никогда, поэтому при включении настройки база переносится туда.
 */
class BackupExclusionModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("BackupExclusion")

    Function("getNoBackupDirectory") {
      File(context.noBackupFilesDir, "SQLite").canonicalPath
    }

    Function("fileExists") { path: String ->
      File(path).exists()
    }

    Function("isExcludedFromBackup") { path: String ->
      File(path).canonicalPath.startsWith(context.noBackupFilesDir.canonicalPath)
    }

    Function("setExcludedFromBackup") { _: String, _: Boolean ->
      // На Android исключение достигается переносом файлов (moveFile).
    }

    Function("moveFile") { from: String, to: String ->
      val source = File(from)
      if (!source.exists()) return@Function
      val target = File(to)
      target.parentFile?.mkdirs()
      if (target.exists()) target.delete()
      if (!source.renameTo(target)) {
        source.copyTo(target, overwrite = true)
        source.delete()
      }
    }
  }
}
