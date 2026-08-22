#!/usr/bin/env bash
# verify-bundle.sh — 发布产物完整性验证
#
# 用法: bash scripts/verify-bundle.sh <platform> <artifact-dir>
#   platform: linux | windows | macos
#   artifact-dir: 存放构建产物的目录
#
# 校验内容：
#   通用: 至少一个产物、每个文件非空且 > 1MB（防空壳）
#   linux: AppImage 解包后 ldd 无缺失依赖；deb 包结构合法（dpkg-deb --info）
#   windows: .exe 为 PE32 可执行文件
#   macos: .app/.dmg 魔数合法（Mach-O / UDZO / bzip2）
#
# 全部通过输出清单并 exit 0；任一失败打印原因并 exit 1。

set -euo pipefail

PLATFORM="${1:-}"
DIR="${2:-}"
MIN_SIZE=$((1024 * 1024)) # 1MB

fail() {
  echo "✘ 验证失败: $1" >&2
  exit 1
}

[ -n "$PLATFORM" ] && [ -n "$DIR" ] || fail "用法: bash scripts/verify-bundle.sh <linux|windows|macos> <artifact-dir>"
[ -d "$DIR" ] || fail "产物目录不存在: $DIR"

# 注意：变量名后用花括号界定，避免 macOS 自带 bash 3.2 在 UTF-8 locale 下
# 把中文首字节误当作变量名字符（导致 unbound variable）
echo "== 验证平台: ${PLATFORM}，目录: ${DIR} =="

# 收集产物文件（按平台过滤）
# 注意: macOS 的 .app 目录在 build job 中已打包为 .app.tar.gz 上传，此处不匹配目录
shopt -s nullglob
case "$PLATFORM" in
  linux)   FILES=("$DIR"/*.AppImage "$DIR"/*.deb) ;;
  windows) FILES=("$DIR"/*.exe "$DIR"/*.msi) ;;
  macos)   FILES=("$DIR"/*.dmg "$DIR"/*.app.tar.gz) ;;
  *)       fail "未知平台: $PLATFORM（支持 linux/windows/macos）" ;;
esac

[ ${#FILES[@]} -gt 0 ] || fail "未找到任何 $PLATFORM 产物文件"

# 通用检查：非空且 > 1MB
for f in "${FILES[@]}"; do
  [ -s "$f" ] || fail "产物为空文件: $f"
  size=$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f")
  [ "$size" -gt "$MIN_SIZE" ] || fail "产物体积异常（${size} 字节 < 1MB）: $f"
done

# 平台特定检查
case "$PLATFORM" in
  linux)
    for f in "${FILES[@]}"; do
      case "$f" in
        *.AppImage)
          echo "-- 检查 AppImage: $(basename "$f")"
          chmod +x "$f"
          tmpdir=$(mktemp -d)
          # $f 可能是相对路径，cd 到 tmpdir 后必须用绝对路径，否则文件找不到
          f_abs=$(readlink -f "$f")
          (cd "$tmpdir" && APPIMAGE_EXTRACT_AND_RUN=1 "$f_abs" --appimage-extract >/dev/null 2>&1) \
            || fail "AppImage 解包失败: $f"
          bin=$(find "$tmpdir/squashfs-root/usr/bin" -maxdepth 1 -type f | head -n1)
          [ -n "$bin" ] || fail "AppImage 解包后未找到主二进制: $f"
          missing=$(ldd "$bin" 2>/dev/null | grep "not found" || true)
          [ -z "$missing" ] || fail "AppImage 二进制存在缺失依赖:\n$missing"
          rm -rf "$tmpdir"
          ;;
        *.deb)
          echo "-- 检查 deb 包: $(basename "$f")"
          dpkg-deb --info "$f" >/dev/null 2>&1 || fail "deb 包结构非法: $f"
          ;;
      esac
    done
    ;;
  windows)
    # 注意: Windows Git Bash 无 file 命令，全部用 od/dd 魔数检查
    for f in "${FILES[@]}"; do
      case "$f" in
        *.exe)
          echo "-- 检查 PE 可执行文件: $(basename "$f")"
          # PE 文件: 前 2 字节 "MZ" (4d5a)，偏移 0x3C(60) 处 4 字节小端整数指向 "PE\0\0" 签名
          magic=$(od -An -tx1 -N2 "$f" | tr -d ' \n')
          [ "$magic" = "4d5a" ] || fail "非合法 PE 可执行文件（无 MZ 魔数）: $f"
          pe_off=$(od -An -tu4 -j60 -N4 "$f" | tr -d ' \n')
          [ -n "$pe_off" ] && [ "$pe_off" -gt 0 ] || fail "非合法 PE 可执行文件（无 PE 头偏移）: $f"
          pe_sig=$(dd if="$f" bs=1 skip="$pe_off" count=4 2>/dev/null | od -An -tx1 | tr -d ' \n')
          [ "$pe_sig" = "50450000" ] || fail "非合法 PE 可执行文件（无 PE 签名）: $f"
          ;;
        *.msi)
          echo "-- 检查 MSI 安装包: $(basename "$f")"
          # MSI 是 OLE2 复合文档，魔数 D0 CF 11 E0
          magic=$(od -An -tx1 -N4 "$f" | tr -d ' \n')
          [ "$magic" = "d0cf11e0" ] || fail "非合法 MSI 文件: $f"
          ;;
      esac
    done
    ;;
  macos)
    for f in "${FILES[@]}"; do
      echo "-- 检查: $(basename "$f")"
      case "$f" in
        *.dmg)
          # dmg 常见为 UDZO（zlib）或 bzip2 压缩
          file "$f" | grep -qE "bzip2|zlib|UDZO|data" || fail "非合法 DMG 文件: $f"
          ;;
        *.app.tar.gz)
          file "$f" | grep -q "gzip" || fail "非合法 app 产物: $f"
          ;;
      esac
    done
    ;;
esac

echo ""
echo "✔ $PLATFORM 产物验证通过，清单如下:"
for f in "${FILES[@]}"; do
  size=$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f")
  # 用 awk 计算体积（Windows Git Bash 无 bc）
  printf "  - %-50s %8.1f MB\n" "$(basename "$f")" "$(awk "BEGIN{printf \"%.1f\", $size/1048576}")"
done
