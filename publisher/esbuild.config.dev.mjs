import fs from 'fs-extra';
import path from 'path';

const plugin_dir = '';

export const syncPlugin = {
  name: "sync-after-build",
  setup(build) {
    console.log("Sync Plugin: Setting up build end listener.");
    build.onEnd((result) => {
      if (result.errors.length === 0) {
        // 构建成功，执行同步
        console.log("Build completed. Syncing files...");
        
        // 将构建输出的所有内容同步到目标目录
        fs.copySync("./styles.css", path.join(plugin_dir, "styles.css"), {
          overwrite: true // 覆盖目标目录中的现有文件
        });
        fs.copySync("./main.js", path.join(plugin_dir, "main.js"), {
          overwrite: true // 覆盖目标目录中的现有文件
        });
        fs.copySync("./manifest.json", path.join(plugin_dir, "manifest.json"), {
          overwrite: true // 覆盖目标目录中的现有文件
        });
        
        console.log("Files synced successfully.");
      } else {
        console.log("Build failed. Skipping file sync.");
      }
    });
  },
};