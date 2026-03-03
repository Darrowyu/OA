/**
 * 版本管理脚本
 * 用法: node scripts/version-manager.mjs [patch|minor|major]
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VERSION_FILE = path.join(__dirname, '..', 'version.json');
const ROOT_PACKAGE = path.join(__dirname, '..', 'package.json');
const BACKEND_PACKAGE = path.join(__dirname, '..', 'backend', 'package.json');
const FRONTEND_PACKAGE = path.join(__dirname, '..', 'frontend', 'package.json');

function readVersion() {
  const content = fs.readFileSync(VERSION_FILE, 'utf-8');
  return JSON.parse(content);
}

function writeVersion(info) {
  fs.writeFileSync(VERSION_FILE, JSON.stringify(info, null, 2) + '\n');
}

function bumpVersion(version, type) {
  const parts = version.split('.').map(Number);
  const [major, minor, patch] = parts;

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      return version;
  }
}

function updatePackageJson(filePath, version) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  文件不存在: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const pkg = JSON.parse(content);
  pkg.version = version;
  fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✅ 已更新: ${path.relative(process.cwd(), filePath)}`);
}

function syncVersion() {
  const info = readVersion();

  console.log(`📦 当前版本: v${info.version}`);
  console.log(`🎯 代号: ${info.codename}`);
  console.log('');

  updatePackageJson(ROOT_PACKAGE, info.version);
  updatePackageJson(BACKEND_PACKAGE, info.version);
  updatePackageJson(FRONTEND_PACKAGE, info.version);

  console.log('');
  console.log('✨ 版本同步完成');
}

function bump(type) {
  const info = readVersion();
  const newVersion = bumpVersion(info.version, type);

  console.log(`⬆️  升级版本: v${info.version} -> v${newVersion}`);
  console.log(`📋 类型: ${type}`);
  console.log('');

  info.version = newVersion;
  info.releaseDate = new Date().toISOString().split('T')[0];
  writeVersion(info);

  syncVersion();

  console.log('');
  console.log(`🎉 版本已升级到 v${newVersion}`);
  console.log(`💡 请记得提交变更: git add . && git commit -m "release: v${newVersion}"`);
}

function showHelp() {
  console.log('版本管理脚本');
  console.log('');
  console.log('用法:');
  console.log('  npm run version:bump <type>  # 升级版本 (patch|minor|major)');
  console.log('  npm run version:sync         # 同步版本到所有 package.json');
  console.log('  npm run version:show         # 显示当前版本');
  console.log('');
  console.log('示例:');
  console.log('  npm run version:bump patch   # 2.1.0 -> 2.1.1');
  console.log('  npm run version:bump minor   # 2.1.0 -> 2.2.0');
  console.log('  npm run version:bump major   # 2.1.0 -> 3.0.0');
}

function showVersion() {
  const info = readVersion();
  console.log(`📦 版本: v${info.version}`);
  console.log(`🎯 代号: ${info.codename}`);
  console.log(`📅 发布日期: ${info.releaseDate}`);
  console.log(`🏷️  名称: ${info.name}`);
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'patch':
    case 'minor':
    case 'major':
      bump(command);
      break;
    case 'sync':
      syncVersion();
      break;
    case 'show':
      showVersion();
      break;
    case 'help':
    default:
      showHelp();
      break;
  }
}

main();
