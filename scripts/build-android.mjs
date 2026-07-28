import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const androidRoot = join(projectRoot, 'android');
const localAppData = process.env.LOCALAPPDATA;

const findBundledJdk = () => {
  if (!localAppData) return null;
  const parent = join(
    localAppData,
    'QishiAndroidBuild',
    'jdk-extracted',
  );
  if (!existsSync(parent)) return null;
  const directory = readdirSync(parent, { withFileTypes: true }).find(
    (entry) =>
      entry.isDirectory() &&
      existsSync(
        join(
          parent,
          entry.name,
          'bin',
          process.platform === 'win32' ? 'java.exe' : 'java',
        ),
      ),
  );
  return directory ? join(parent, directory.name) : null;
};

const environment = { ...process.env };
if (!environment.JAVA_HOME) {
  const bundledJdk = findBundledJdk();
  if (bundledJdk) environment.JAVA_HOME = bundledJdk;
}
environment.ANDROID_SDK_ROOT ??= environment.ANDROID_HOME;
if (!environment.ANDROID_SDK_ROOT && localAppData) {
  const bundledSdk = join(localAppData, 'QishiAndroidBuild', 'android-sdk');
  if (existsSync(bundledSdk)) environment.ANDROID_SDK_ROOT = bundledSdk;
}
environment.ANDROID_HOME ??= environment.ANDROID_SDK_ROOT;

const javaExecutable = environment.JAVA_HOME
  ? join(
      environment.JAVA_HOME,
      'bin',
      process.platform === 'win32' ? 'java.exe' : 'java',
    )
  : null;
if (!javaExecutable || !existsSync(javaExecutable)) {
  throw new Error(
    '未找到 JDK 21。请先设置 JAVA_HOME，或按 README 安装 Android 构建环境。',
  );
}
if (
  !environment.ANDROID_SDK_ROOT ||
  !existsSync(environment.ANDROID_SDK_ROOT)
) {
  throw new Error(
    '未找到 Android SDK。请先设置 ANDROID_SDK_ROOT，或按 README 安装 Platform 36。',
  );
}

const release = process.argv.includes('--release');
if (
  release &&
  !existsSync(join(androidRoot, 'keystore.properties'))
) {
  throw new Error(
    '缺少 Android 签名配置。请先运行 pnpm android:signing，并安全备份生成的签名文件。',
  );
}
const localGradle =
  localAppData &&
  join(
    localAppData,
    'QishiAndroidBuild',
    'gradle',
    'gradle-8.14.3',
    'bin',
    process.platform === 'win32' ? 'gradle.bat' : 'gradle',
  );
const executable =
  localGradle && existsSync(localGradle)
    ? localGradle
    : process.platform === 'win32'
      ? 'gradlew.bat'
      : './gradlew';
const gradleTask = release ? 'assembleRelease' : 'assembleDebug';
const result =
  process.platform === 'win32'
    ? spawnSync(`"${executable}" ${gradleTask} --no-daemon`, {
        cwd: androidRoot,
        env: environment,
        stdio: 'inherit',
        shell: true,
      })
    : spawnSync(executable, [gradleTask, '--no-daemon'], {
        cwd: androidRoot,
        env: environment,
        stdio: 'inherit',
      });

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
