// ============================================
// M2 玩机核心：单元测试
// ============================================

#[cfg(test)]
mod m2_tests {
    use crate::adb::m2::*;
    use crate::adb::m2_commands::map_reboot_type;
    use adb_client::RebootType;

    // ============ 解析函数 ============

    #[test]
    fn test_parse_wm_size() {
        assert_eq!(
            parse_wm_size("Physical size: 1344x2992\n"),
            Some("1344x2992".to_string())
        );
        assert_eq!(parse_wm_size("Physical size: 1080x2400"), Some("1080x2400".to_string()));
        assert_eq!(parse_wm_size("no size here"), None);
    }

    #[test]
    fn test_parse_wm_density() {
        assert_eq!(parse_wm_density("Physical density: 480\n"), Some(480));
        assert_eq!(parse_wm_density("Physical density: 420"), Some(420));
        assert_eq!(parse_wm_density("garbage"), None);
    }

    #[test]
    fn test_parse_overscan() {
        assert_eq!(parse_overscan("0,0,0,0"), Some([0, 0, 0, 0]));
        assert_eq!(parse_overscan("overscan 0,100,0,0"), Some([0, 100, 0, 0]));
        assert_eq!(parse_overscan("-10,20,-30,40"), Some([-10, 20, -30, 40]));
        assert_eq!(parse_overscan("no overscan"), None);
    }

    #[test]
    fn test_parse_battery() {
        let out = "Current Battery Service state:\n  AC powered: false\n  level: 33\n  temperature: 350\n  status: 2\n";
        let b = parse_battery(out).unwrap();
        assert_eq!(b.level, 33);
        assert_eq!(b.temperature, 350);
        assert_eq!(b.status, 2);
        assert!(!b.simulating);

        assert!(parse_battery("incomplete\nlevel: 1\n").is_none());
    }

    #[test]
    fn test_build_wm_commands() {
        assert_eq!(build_wm_size_command("1080x2400"), "wm size 1080x2400");
        assert_eq!(build_wm_density_command(420), "wm density 420");
        assert_eq!(build_wm_overscan_command(&[0, 100, 0, 0]), "wm overscan 0,100,0,0");
    }

    #[test]
    fn test_build_settings_put() {
        assert_eq!(
            build_settings_put_command("global", "window_animation_scale", "1.0"),
            "settings put global window_animation_scale 1.0"
        );
    }

    #[test]
    fn test_build_battery_set() {
        assert_eq!(build_battery_set_command("level", 50), "dumpsys battery set level 50");
        assert_eq!(build_battery_set_command("temperature", 350), "dumpsys battery set temperature 350");
    }

    #[test]
    fn test_build_input_commands() {
        assert_eq!(build_input_tap_command(540, 1200), "input tap 540 1200");
        assert_eq!(
            build_input_swipe_command(540, 1200, 540, 400, 300),
            "input swipe 540 1200 540 400 300"
        );
        assert_eq!(build_input_keyevent_command("KEYCODE_HOME"), "input keyevent KEYCODE_HOME");
        assert_eq!(build_input_text_command("hello world"), "input text hello%sworld");
    }

    // ============ RebootType 映射 ============

    #[test]
    fn test_map_reboot_type() {
        assert!(matches!(map_reboot_type("system").unwrap(), RebootType::System));
        assert!(matches!(map_reboot_type("recovery").unwrap(), RebootType::Recovery));
        assert!(matches!(map_reboot_type("bootloader").unwrap(), RebootType::Bootloader));
        assert!(matches!(map_reboot_type("fastboot").unwrap(), RebootType::Fastboot));
        assert!(map_reboot_type("invalid").is_err());
    }

    // ============ 脚本 DSL 解析器 ============

    #[test]
    fn test_parse_script_basic() {
        let script = "tap 540 1200\nsleep 1000\nkeyevent KEYCODE_HOME\n";
        let flat = parse_script_lines(script).unwrap();
        assert_eq!(flat.len(), 3);
        assert_eq!(flat[0].line_no, 1);
        assert_eq!(flat[0].action, ScriptAction::Tap { x: 540, y: 1200 });
        assert_eq!(flat[1].action, ScriptAction::Sleep { ms: 1000 });
        assert_eq!(flat[2].action, ScriptAction::Keyevent { keycode: "KEYCODE_HOME".to_string() });
    }

    #[test]
    fn test_parse_script_comment_and_blank() {
        let script = "# 注释\n\ntap 1 2  # 行尾注释\n";
        let flat = parse_script_lines(script).unwrap();
        assert_eq!(flat.len(), 1);
        assert_eq!(flat[0].line_no, 3);
    }

    #[test]
    fn test_parse_script_loop_expand() {
        let script = "loop 3\n  tap 100 200\nend\n";
        let flat = parse_script_lines(script).unwrap();
        assert_eq!(flat.len(), 3);
        assert!(flat.iter().all(|l| l.action == ScriptAction::Tap { x: 100, y: 200 }));
    }

    #[test]
    fn test_parse_script_nested_loop() {
        let script = "loop 2\n  loop 2\n    tap 1 1\n  end\nend\n";
        let flat = parse_script_lines(script).unwrap();
        assert_eq!(flat.len(), 4);
    }

    #[test]
    fn test_parse_script_loop_too_deep() {
        let script = "loop 1\nloop 1\nloop 1\nloop 1\ntap 1 1\nend\nend\nend\nend\n";
        let err = parse_script_lines(script).unwrap_err();
        assert!(err.contains("嵌套超过"), "错误信息: {}", err);
    }

    #[test]
    fn test_parse_script_end_without_loop() {
        let script = "tap 1 1\nend\n";
        let err = parse_script_lines(script).unwrap_err();
        assert!(err.contains("没有匹配的 loop"), "错误信息: {}", err);
    }

    #[test]
    fn test_parse_script_loop_without_end() {
        let script = "loop 2\ntap 1 1\n";
        let err = parse_script_lines(script).unwrap_err();
        assert!(err.contains("缺少匹配的 end"), "错误信息: {}", err);
    }

    #[test]
    fn test_parse_script_invalid_line() {
        let script = "tap 1\n"; // 参数不足
        let err = parse_script_lines(script).unwrap_err();
        assert!(err.contains("第 1 行"), "错误信息: {}", err);

        let script2 = "foobar 1 2\n";
        let err2 = parse_script_lines(script2).unwrap_err();
        assert!(err2.contains("未知指令"), "错误信息: {}", err2);
    }

    #[test]
    fn test_parse_script_text_with_spaces() {
        let script = "text hello world\n";
        let flat = parse_script_lines(script).unwrap();
        assert_eq!(flat[0].action, ScriptAction::Text { text: "hello world".to_string() });
    }
}
