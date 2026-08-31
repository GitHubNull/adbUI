// 真机验证示例：直接调用 get_device_report 命令函数，打印完整报告 JSON。
// 用法：cargo run --example real_report -- <device_id>
use adbui_lib::adb::get_device_report;

#[tokio::main]
async fn main() {
    let device_id = std::env::args().nth(1).unwrap_or_else(|| "88bc6e81".to_string());
    match get_device_report(device_id).await {
        Ok(report) => println!("{}", serde_json::to_string_pretty(&report).unwrap()),
        Err(e) => eprintln!("report error: {}", e),
    }
}
