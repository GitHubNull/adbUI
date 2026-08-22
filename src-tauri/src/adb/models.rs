use serde::Serialize;

// ============================================
// 数据模型
// ============================================

#[derive(Serialize, Clone, Debug)]
pub struct DeviceInfo {
    pub id: String,
    pub model: String,
    pub status: DeviceStatus,
    pub connection: String,
}

#[derive(Serialize, Clone, Debug, PartialEq)]
pub enum DeviceStatus {
    Online,
    Offline,
    Unauthorized,
    Unknown,
}

#[derive(Serialize, Debug)]
pub struct AdbResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

#[derive(Serialize, Debug)]
pub struct DeviceDetail {
    pub id: String,
    pub model: String,
    pub brand: String,
    pub android_version: String,
    pub sdk_version: String,
    pub build_number: String,
    pub product: String,
    pub device: String,
    pub battery_level: Option<i32>,
}

#[derive(Serialize, Clone, Debug)]
pub struct NetworkDevice {
    pub ip: String,
    pub port: u16,
    pub fullname: String,
}

/// 二维码配对信息
#[derive(Serialize, Clone, Debug)]
pub struct QrPairingInfo {
    /// 二维码内容（WIFI:T:ADB;S:xxx;P:xxx;;）
    pub qr_data: String,
    /// PNG 图片的 base64 编码
    pub qr_image_base64: String,
    /// mDNS 服务名
    pub service_name: String,
    /// 配对码
    pub password: String,
}
