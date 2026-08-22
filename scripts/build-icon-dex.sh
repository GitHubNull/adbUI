#!/usr/bin/env bash
# ============================================
# 构建设备端应用图标提取器 dex
#
# 产物: src-tauri/icon_extractor.dex(提交仓库,常规构建无需 SDK)
#
# 依赖: javac / java(本机 JDK)+ android.jar 存根 + d8(R8 内置)
#   - 优先使用本机 Android SDK(ANDROID_HOME 或常见安装路径)
#   - 未安装 SDK 时,自动下载 android.jar 存根(约 25MB)与 R8(约 15MB)
#     到 tmp/dex-tools(已被 .gitignore 忽略),下载耗时视网络而定
# ============================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
JAVA_SRC="$ROOT_DIR/src-tauri/icon-extractor/IconExtractor.java"
OUT_DEX="$ROOT_DIR/src-tauri/icon_extractor.dex"
TOOLS_DIR="$ROOT_DIR/tmp/dex-tools"
BUILD_DIR="$ROOT_DIR/tmp/dex-build"
MIN_API=21

command -v javac >/dev/null 2>&1 || { echo "错误: 未找到 javac,请先安装 JDK"; exit 1; }
command -v java >/dev/null 2>&1 || { echo "错误: 未找到 java,请先安装 JRE"; exit 1; }

# ============================================
# 定位 android.jar 与 d8
# ============================================

ANDROID_JAR=""
D8_JAR=""

# 常见 SDK 安装路径
SDK_CANDIDATES=(
  "${ANDROID_HOME:-}"
  "$HOME/Android/Sdk"
  "/usr/lib/android-sdk"
  "$HOME/Library/Android/sdk"
)

for dir in "${SDK_CANDIDATES[@]}"; do
  if [ -n "$dir" ] && [ -d "$dir" ]; then
    # 取版本最高的 platforms / build-tools
    ANDROID_JAR="$(ls -1 "$dir"/platforms/android-*/android.jar 2>/dev/null | sort -V | tail -1 || true)"
    D8_JAR="$(ls -1 "$dir"/build-tools/*/lib/d8.jar 2>/dev/null | sort -V | tail -1 || true)"
    if [ -n "$ANDROID_JAR" ]; then
      echo "使用本机 Android SDK: $dir"
      break
    fi
  fi
done

mkdir -p "$TOOLS_DIR"

# 本地代理检测(常见代理端口 7890),提升 GitHub/Google 下载速度;
# 已设置 HTTPS_PROXY/HTTP_PROXY 时不做覆盖
if [ -z "${HTTPS_PROXY:-}" ] && [ -z "${https_proxy:-}" ]; then
  if timeout 1 bash -c 'echo > /dev/tcp/127.0.0.1/7890' 2>/dev/null; then
    export HTTPS_PROXY="http://127.0.0.1:7890"
    export HTTP_PROXY="http://127.0.0.1:7890"
    echo "检测到本地代理 127.0.0.1:7890,已启用"
  fi
fi

# android.jar 存根缺失时自动下载
if [ -z "$ANDROID_JAR" ]; then
  ANDROID_JAR="$TOOLS_DIR/android.jar"
  if [ ! -s "$ANDROID_JAR" ]; then
    echo "未检测到 Android SDK,下载 android.jar 存根(约 25MB)..."
    curl -L --fail -o "$ANDROID_JAR" \
      "https://github.com/Sable/android-platforms/raw/master/android-33/android.jar"
    # 校验 zip 完整性(EOCD 签名),损坏则删除,避免 javac 读坏文件
    if ! tail -c 22 "$ANDROID_JAR" | od -An -tx1 | grep -q '50 4b 05 06'; then
      rm -f "$ANDROID_JAR"
      echo "错误: android.jar 下载不完整,已删除,请重新运行本脚本"
      exit 1
    fi
  fi
fi

# d8 缺失时自动下载 R8(独立 jar,内置 d8)
# R8 8.x 需 Java 11+;Java 8 环境使用 R8 2.1.75(dl.google.com 上已验证存在)
JAVA_MAJOR="$(java -version 2>&1 | head -1 | sed 's/.*version "\([0-9]*\).*/\1/')"
if [ -z "$JAVA_MAJOR" ] || [ "$JAVA_MAJOR" -lt 11 ]; then
  R8_VERSION="2.1.75"
else
  R8_VERSION="8.2.42"
fi
if [ -z "$D8_JAR" ]; then
  D8_JAR="$TOOLS_DIR/r8.jar"
  if [ ! -s "$D8_JAR" ]; then
    echo "下载 R8(内置 d8,约 15MB,版本 $R8_VERSION)..."
    curl -L --fail -o "$D8_JAR" \
      "https://dl.google.com/dl/android/maven2/com/android/tools/r8/$R8_VERSION/r8-$R8_VERSION.jar"
    # 校验 zip 完整性(EOCD 签名),损坏则删除,避免 d8 运行失败
    if ! tail -c 22 "$D8_JAR" | od -An -tx1 | grep -q '50 4b 05 06'; then
      rm -f "$D8_JAR"
      echo "错误: R8 下载不完整,已删除,请重新运行本脚本"
      exit 1
    fi
  fi
fi

# ============================================
# 编译 Java -> dex
# ============================================

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/classes"

echo "编译 $JAVA_SRC ..."
javac -source 8 -target 8 -nowarn \
  -classpath "$ANDROID_JAR" \
  -d "$BUILD_DIR/classes" \
  "$JAVA_SRC"

echo "d8 生成 dex(min-api $MIN_API)..."
java -cp "$D8_JAR" com.android.tools.r8.D8 \
  --min-api "$MIN_API" \
  --lib "$ANDROID_JAR" \
  --output "$BUILD_DIR" \
  "$BUILD_DIR/classes/com/adbui/IconExtractor.class"

cp "$BUILD_DIR/classes.dex" "$OUT_DEX"

echo "完成: $OUT_DEX ($(stat -c %s "$OUT_DEX") bytes)"
