package com.adbui;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.os.Looper;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * adbUI 设备端应用图标提取器。
 *
 * 通过 app_process 以 shell 用户身份运行(无需 root),调用系统
 * PackageManager 加载所有已安装应用的启动图标,导出为 PNG 并打包 zip,
 * 供宿主机 pull 后本地缓存。
 *
 * 用法:
 *   export CLASSPATH=/data/local/tmp/adbui_icons.dex
 *   app_process /data/local/tmp com.adbui.IconExtractor <输出目录>
 *
 * 产物:
 *   <输出目录>/<包名>.png  各应用图标
 *   <输出目录>/../adbui_icons.zip  全部图标打包(输出目录固定为 /data/local/tmp/adbui_icons)
 */
public class IconExtractor {

    private static final String ZIP_NAME = "adbui_icons.zip";

    public static void main(String[] args) {
        String outDir = args.length > 0 ? args[0] : "/data/local/tmp/adbui_icons";

        // 1. 初始化系统上下文(ActivityThread 为 hidden API,
        //    编译期不存在于 SDK 存根,运行时通过反射获取)
        Context context = getSystemContext();
        PackageManager pm = context.getPackageManager();

        // 2. 准备输出目录
        File dir = new File(outDir);
        if (dir.exists()) {
            File[] olds = dir.listFiles();
            if (olds != null) {
                for (File f : olds) {
                    //noinspection ResultOfMethodCallIgnored
                    f.delete();
                }
            }
        } else if (!dir.mkdirs()) {
            System.err.println("ERR: cannot create output dir: " + outDir);
            System.exit(1);
        }

        // 3. 遍历所有应用导出图标(单个失败不影响整体)
        List<File> written = new ArrayList<File>();
        List<ApplicationInfo> apps = pm.getInstalledApplications(0);
        for (ApplicationInfo ai : apps) {
            String pkg = ai.packageName;
            try {
                Drawable drawable = pm.getApplicationIcon(pkg);
                if (drawable == null) {
                    continue;
                }
                Bitmap bitmap = drawToBitmap(drawable);
                if (bitmap == null) {
                    continue;
                }
                File out = new File(dir, pkg + ".png");
                writePng(bitmap, out);
                bitmap.recycle();
                written.add(out);
            } catch (Throwable t) {
                // 单个应用图标加载失败(如已卸载的残留记录),跳过即可
                System.err.println("WARN: " + pkg + ": " + t);
            }
        }

        // 4. 打包 zip(供宿主机一次 pull,避免逐文件传输)
        File zipFile = new File(dir.getParentFile(), ZIP_NAME);
        try {
            zipFiles(written, zipFile);
        } catch (Throwable t) {
            System.err.println("ERR: zip failed: " + t);
            System.exit(1);
        }

        System.out.println("DONE:" + written.size());
    }

    /** 反射获取系统 Context(android.app.ActivityThread 为 hidden API,
     *  不出现在 SDK 的 android.jar 存根中,无法直接编译引用;
     *  app_process 以 shell 用户运行时不受 hidden API 限制) */
    private static Context getSystemContext() {
        try {
            // systemMain() 内部会创建 Handler,要求当前线程已有主 Looper
            Looper.prepareMainLooper();
            Class<?> atClass = Class.forName("android.app.ActivityThread");
            Object thread = atClass.getMethod("systemMain").invoke(null);
            return (Context) atClass.getMethod("getSystemContext").invoke(thread);
        } catch (Throwable t) {
            t.printStackTrace();
            System.exit(1);
            return null;
        }
    }

    /** Drawable 画入独立 Bitmap(不直接复用 BitmapDrawable 的位图,避免复用后 recycle 出错) */
    private static Bitmap drawToBitmap(Drawable drawable) {
        int w = Math.max(drawable.getIntrinsicWidth(), 1);
        int h = Math.max(drawable.getIntrinsicHeight(), 1);
        Bitmap bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        drawable.setBounds(0, 0, w, h);
        drawable.draw(canvas);
        return bitmap;
    }

    /** Bitmap 压缩为 PNG 写入文件 */
    private static void writePng(Bitmap bitmap, File out) throws Exception {
        OutputStream os = new FileOutputStream(out);
        try {
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, os);
        } finally {
            os.close();
        }
    }

    /** 将已导出的 PNG 打包为 zip(条目名为 包名.png,不含目录前缀) */
    private static void zipFiles(List<File> files, File zipFile) throws Exception {
        ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(zipFile));
        try {
            byte[] buf = new byte[8192];
            for (File f : files) {
                ZipEntry entry = new ZipEntry(f.getName());
                zos.putNextEntry(entry);
                java.io.FileInputStream fis = new java.io.FileInputStream(f);
                try {
                    int n;
                    while ((n = fis.read(buf)) > 0) {
                        zos.write(buf, 0, n);
                    }
                } finally {
                    fis.close();
                }
                zos.closeEntry();
            }
        } finally {
            zos.close();
        }
    }
}
