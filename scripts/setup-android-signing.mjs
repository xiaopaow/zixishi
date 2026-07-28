import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const androidRoot = join(projectRoot, 'android');
const propertiesPath = join(androidRoot, 'keystore.properties');
const localAppData = process.env.LOCALAPPDATA;
const dataRoot =
  localAppData ??
  process.env.XDG_DATA_HOME ??
  (process.env.HOME
    ? join(process.env.HOME, '.local', 'share')
    : null);

if (!dataRoot) {
  throw new Error('未找到本机数据目录，无法保存 Android 签名文件。');
}

const signingRoot = join(dataRoot, 'QishiAndroidSigning');
const keystorePath = join(signingRoot, 'qishi-beta-release.p12');
const backupNotePath = join(signingRoot, '务必备份.txt');

if (existsSync(keystorePath) || existsSync(propertiesPath)) {
  throw new Error(
    '签名文件或配置已经存在。为避免破坏后续覆盖升级，本脚本不会覆盖它们。',
  );
}

const findKeytool = () => {
  if (process.env.JAVA_HOME) {
    const candidate = join(
      process.env.JAVA_HOME,
      'bin',
      process.platform === 'win32' ? 'keytool.exe' : 'keytool',
    );
    if (existsSync(candidate)) return candidate;
  }

  if (!localAppData) return null;
  const parent = join(localAppData, 'QishiAndroidBuild', 'jdk-extracted');
  if (!existsSync(parent)) return null;
  for (const entry of readdirSync(parent, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = join(
      parent,
      entry.name,
      'bin',
      process.platform === 'win32' ? 'keytool.exe' : 'keytool',
    );
    if (existsSync(candidate)) return candidate;
  }
  return null;
};

const keytool = findKeytool();
if (!keytool) {
  throw new Error('未找到 JDK keytool。请安装 JDK 21 并设置 JAVA_HOME。');
}

mkdirSync(signingRoot, { recursive: true });
const password = randomBytes(36).toString('base64url');
const passwordEnvironmentName = 'QISHI_ANDROID_KEYSTORE_PASSWORD';
const environment = {
  ...process.env,
  [passwordEnvironmentName]: password,
};
const generated = spawnSync(
  keytool,
  [
    '-genkeypair',
    '-keystore',
    keystorePath,
    '-storetype',
    'PKCS12',
    '-storepass:env',
    passwordEnvironmentName,
    '-keypass:env',
    passwordEnvironmentName,
    '-alias',
    'qishi-beta',
    '-keyalg',
    'RSA',
    '-keysize',
    '4096',
    '-validity',
    '10000',
    '-dname',
    'CN=Qishi, OU=Android Beta, O=Xiaopaow, L=Shanghai, ST=Shanghai, C=CN',
  ],
  {
    env: environment,
    stdio: 'inherit',
  },
);
if (generated.error) throw generated.error;
if (generated.status !== 0) {
  throw new Error(`keytool 生成签名失败，退出码 ${generated.status}。`);
}

writeFileSync(
  propertiesPath,
  [
    `storeFile=${keystorePath.replaceAll('\\', '/')}`,
    `storePassword=${password}`,
    'keyAlias=qishi-beta',
    `keyPassword=${password}`,
    '',
  ].join('\n'),
  { encoding: 'utf8', flag: 'wx' },
);
writeFileSync(
  backupNotePath,
  [
    '栖时 Android 内测签名',
    '',
    `1. 请同时备份 ${keystorePath}`,
    `2. 请同时备份 ${propertiesPath}`,
    '3. 任一文件丢失，都无法再发布可覆盖升级的同包名版本。',
    '4. 不要把 keystore.properties、密码或签名文件提交到 GitHub。',
    '',
  ].join('\r\n'),
  { encoding: 'utf8', flag: 'wx' },
);

console.log('已创建栖时 Android 固定内测签名。');
console.log(`签名文件：${keystorePath}`);
console.log(`本机构建配置：${relative(projectRoot, propertiesPath)}`);
console.log('请按签名目录中的“务必备份.txt”保存这两份文件。');
