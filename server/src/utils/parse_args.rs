/// 解析命令行，仅支持 --config <path> 和 --help/-h
pub fn parse_args(args: &[String]) -> (bool, String) {
    // 默认配置路径
    let mut config_path = "config.json".to_string();
    let mut show_help = false;

    let mut i = 1; // 跳过可执行文件名
    while i < args.len() {
        match args[i].as_str() {
            "--help" | "-h" => {
                show_help = true;
                break;
            }
            "--config" => {
                if i + 1 < args.len() {
                    config_path = args[i + 1].clone();
                    i += 1; // 跳过路径参数
                } else {
                    eprintln!("--config requires a path");
                    std::process::exit(1);
                }
            }
            _ => {
                // 忽略未知参数
            }
        }
        i += 1;
    }

    (show_help, config_path)
}