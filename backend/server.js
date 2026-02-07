const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const https = require('https');
const Excel = require('exceljs');

const app = express();

// 网络配置常量 - 确保代理和VPN完全兼容
const NETWORK_CONFIG = {
    // 服务器配置
    port: 3000,
    trustProxy: true, // 信任代理，支持负载均衡器、CDN和代理

    // CORS配置
    corsOrigin: '*', // 允许所有来源访问，支持代理和VPN
    corsMaxAge: 86400, // 预检请求结果缓存24小时

    // 速率限制配置
    rateLimitWindowMs: 15 * 60 * 1000, // 15分钟
    rateLimitMax: 1000, // 每个IP每15分钟最多1000个请求（宽松限制）

    // 缓存配置
    cacheTTL: 60 * 1000, // 缓存有效期：60秒
    staticCacheMaxAge: 86400000, // 静态资源缓存1天

    // 文件上传配置
    maxFileSize: 10 * 1024 * 1024, // 单个文件最大10MB
    maxTotalSize: 15 * 1024 * 1024, // 总文件大小最大15MB
    allowedFileTypes: ['pdf'], // 只允许PDF格式

    // 安全配置
    helmetEnabled: true,
    cspEnabled: true,

    // 调试配置
    debugMode: true
};

const port = NETWORK_CONFIG.port;

// 信任代理配置，支持负载均衡器、CDN和代理
app.set('trust proxy', NETWORK_CONFIG.trustProxy);

// 统一的日志函数，自动添加时间戳
function logWithTime(message, ...args) {
    const now = new Date();
    const timeStr = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    console.log(`【${timeStr}】${message}`, ...args);
}

function errorWithTime(message, ...args) {
    const now = new Date();
    const timeStr = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    console.error(`【${timeStr}】${message}`, ...args);
}

// 服务器配置
const SERVER_CONFIG = {
    url: 'http://192.168.1.104:3000/', // 服务器URL，用于邮件中的链接
    emailRetryDelay: 3000 // 邮件发送失败重试延迟（毫秒），将持续重试直到成功
};

// 添加内存缓存
const cache = {
    users: null,
    applications: null,
    archivedApplications: null, // 归档数据缓存
    lastUserUpdate: 0,
    lastApplicationUpdate: 0,
    lastArchivedUpdate: 0, // 归档数据最后更新时间
    cacheTTL: NETWORK_CONFIG.cacheTTL // 缓存有效期：60秒
};

// 邮件发送配置
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'makrite.zhimian@gmail.com', // Gmail邮箱
        pass: 'sokypzpgwlxmsrzn' // 应使用Gmail的应用专用密码，而非普通密码
    }
});

// 中间件配置
// 增强CORS配置，允许所有来源，并增加预检请求缓存时间
const corsOptions = {
    origin: NETWORK_CONFIG.corsOrigin, // 允许所有来源访问，支持代理和VPN
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
    maxAge: NETWORK_CONFIG.corsMaxAge, // 预检请求结果缓存24小时
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Forwarded-For', 'X-Real-IP']
};
app.use(cors(corsOptions));

// 添加OPTIONS请求的全局处理
app.options('*', cors(corsOptions));

// 静态资源配置
app.use(express.static(path.join(__dirname, '..', 'frontend'), {
    maxAge: NETWORK_CONFIG.staticCacheMaxAge // 静态资源缓存1天
}));

// 请求体解析配置
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// 添加压缩中间件
const compression = require('compression');
app.use(compression());

// 添加安全头配置，确保代理和VPN兼容性
const helmet = require('helmet');
if (NETWORK_CONFIG.helmetEnabled) {
    app.use(helmet({
        contentSecurityPolicy: NETWORK_CONFIG.cspEnabled ? {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "*"], // 允许连接到任何源，支持代理
                fontSrc: ["'self'", "https:", "data:"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        } : false,
        crossOriginEmbedderPolicy: false, // 禁用以避免代理问题
        crossOriginResourcePolicy: false, // 禁用以支持跨域访问
    }));
}

// 添加速率限制，但对代理友好
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: NETWORK_CONFIG.rateLimitWindowMs, // 15分钟
    max: NETWORK_CONFIG.rateLimitMax, // 每个IP每15分钟最多1000个请求（宽松限制）
    message: '请求过于频繁，请稍后再试',
    standardHeaders: true,
    legacyHeaders: false,
    // 信任代理，正确获取真实IP
    trustProxy: NETWORK_CONFIG.trustProxy,
    // 跳过成功的请求
    skipSuccessfulRequests: true,
    // 自定义键生成器，考虑代理头
    keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress ||
               req.headers['x-forwarded-for'] ||
               req.headers['x-real-ip'] ||
               'unknown';
    },
});
app.use(limiter);

// 数据存储路径
const usersFile = path.join(__dirname, 'data', 'users.json');
const applicationsFile = path.join(__dirname, 'data', 'applications.json');
const reminderSettingsFile = path.join(__dirname, 'data', 'reminder-settings.json');
const attachmentArchiveDir = path.join(__dirname, '..', 'archive'); // 附件归档目录（旧逻辑，保留兼容性）
const archiveDataDir = path.join(__dirname, 'data', 'archive'); // 申请数据归档目录（新逻辑）

// 初始化数据文件夹和文件
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify([{ username: 'admin', password: 'admin123', role: 'admin', email: 'admin@example.com', department: '管理部' }]));
}
if (!fs.existsSync(applicationsFile)) {
    fs.writeFileSync(applicationsFile, JSON.stringify([]));
}
if (!fs.existsSync(reminderSettingsFile)) {
    // 初始化默认提醒设置
    const defaultSettings = {
        priority: {
            high: {
                initialDelay: 4,
                normalInterval: 4,
                mediumInterval: 2,
                urgentInterval: 1
            },
            medium: {
                initialDelay: 8,
                normalInterval: 8,
                mediumInterval: 4,
                urgentInterval: 2
            },
            low: {
                initialDelay: 12,
                normalInterval: 12,
                mediumInterval: 6,
                urgentInterval: 3
            }
        },
        timeControl: {
            workingDays: {
                enabled: false,
                days: [1, 2, 3, 4, 5], // 1=周一, 2=周二, ..., 7=周日
                startTime: "09:00",
                endTime: "18:00"
            },
            customDates: {
                enabled: false,
                skipDates: []
            }
        }
    };
    fs.writeFileSync(reminderSettingsFile, JSON.stringify(defaultSettings, null, 2));
}
// 初始化附件归档目录（旧逻辑）
if (!fs.existsSync(attachmentArchiveDir)) {
    fs.mkdirSync(attachmentArchiveDir, { recursive: true });
}
// 初始化数据归档目录（新逻辑）
if (!fs.existsSync(archiveDataDir)) {
    fs.mkdirSync(archiveDataDir, { recursive: true });
}

// 读取用户数据（带缓存）
function getUsers() {
    const now = Date.now();
    if (cache.users && (now - cache.lastUserUpdate < cache.cacheTTL)) {
        return cache.users;
    }

    try {
        const data = fs.readFileSync(usersFile);
        cache.users = JSON.parse(data);

        // 数据迁移：为现有用户添加申请权限字段
        let hasChanges = false;
        cache.users.forEach(user => {
            if (user.canSubmitApplication === undefined) {
                // 根据角色设置默认申请权限
                if (['user', 'director', 'admin'].includes(user.role)) {
                    user.canSubmitApplication = true;
                } else {
                    user.canSubmitApplication = false;
                }
                hasChanges = true;
            }
        });

        // 如果有变更，保存数据
        if (hasChanges) {
            console.log('数据迁移：为现有用户添加申请权限字段');
            fs.writeFileSync(usersFile, JSON.stringify(cache.users, null, 2));
        }

        cache.lastUserUpdate = now;
        return cache.users;
    } catch (error) {
        console.error('读取用户数据失败:', error);
        return [];
    }
}

// 保存用户数据（更新缓存）- 立即响应优化版
function saveUsers(users) {
    try {
        // 立即更新缓存，提供快速响应
        cache.users = users;
        cache.lastUserUpdate = Date.now();

        // 异步写入文件，不阻塞响应
        setImmediate(() => {
            try {
                // 检查数据大小
                const jsonData = JSON.stringify(users, null, 2);
                const dataSizeInMB = Buffer.byteLength(jsonData) / (1024 * 1024);

                console.log(`异步保存用户数据: ${users.length}个用户, 数据大小: ${dataSizeInMB.toFixed(2)}MB`);

                // 如果数据过大，可能会导致写入问题
                if (dataSizeInMB > 50) {
                    console.warn(`用户数据过大 (${dataSizeInMB.toFixed(2)}MB)，可能导致性能问题`);
                }

                // 创建备份
                const backupPath = `${usersFile}.backup`;
                if (fs.existsSync(usersFile)) {
                    fs.copyFileSync(usersFile, backupPath);
                }

                // 写入新数据
                fs.writeFileSync(usersFile, jsonData);

                console.log('用户数据已异步保存到文件');
            } catch (error) {
                console.error('异步保存用户数据失败:', error);

                // 尝试从备份恢复
                const backupPath = `${usersFile}.backup`;
                if (fs.existsSync(backupPath)) {
                    try {
                        fs.copyFileSync(backupPath, usersFile);
                        console.log('已从备份恢复用户数据');
                    } catch (backupError) {
                        console.error('从备份恢复失败:', backupError);
                    }
                }
            }
        });

        return true;
    } catch (error) {
        console.error('更新用户缓存失败:', error);
        return false;
    }
}

// 同步保存用户数据（用于关键操作）
function saveUsersSync(users) {
    try {
        // 检查数据大小
        const jsonData = JSON.stringify(users, null, 2);
        const dataSizeInMB = Buffer.byteLength(jsonData) / (1024 * 1024);

        console.log(`同步保存用户数据: ${users.length}个用户, 数据大小: ${dataSizeInMB.toFixed(2)}MB`);

        // 如果数据过大，可能会导致写入问题
        if (dataSizeInMB > 50) {
            console.error(`用户数据过大 (${dataSizeInMB.toFixed(2)}MB)，可能导致性能问题`);
        }

        // 创建备份
        const backupPath = `${usersFile}.backup`;
        if (fs.existsSync(usersFile)) {
            fs.copyFileSync(usersFile, backupPath);
        }

        // 写入新数据
        fs.writeFileSync(usersFile, jsonData);

        // 更新缓存
        cache.users = users;
        cache.lastUserUpdate = Date.now();

        return true;
    } catch (error) {
        console.error('同步保存用户数据失败:', error);

        // 尝试从备份恢复
        const backupPath = `${usersFile}.backup`;
        if (fs.existsSync(backupPath)) {
            try {
                fs.copyFileSync(backupPath, usersFile);
                console.log('已从备份恢复用户数据');
            } catch (backupError) {
                console.error('从备份恢复失败:', backupError);
            }
        }

        return false;
    }
}

// 读取申请数据（带缓存和备份恢复）
function getApplications() {
    const now = Date.now();
    if (cache.applications && (now - cache.lastApplicationUpdate < cache.cacheTTL)) {
        return cache.applications;
    }

    try {
        const data = fs.readFileSync(applicationsFile, 'utf8');

        // 检查文件是否为空或损坏
        if (!data || data.trim() === '') {
            throw new Error('申请数据文件为空');
        }

        const applications = JSON.parse(data);

        // 验证数据完整性
        if (!validateApplicationsData(applications)) {
            throw new Error('申请数据验证失败');
        }

        cache.applications = applications;
        cache.lastApplicationUpdate = now;
        return cache.applications;
    } catch (error) {
        console.error('读取申请数据失败:', error);

        // 尝试从备份文件恢复
        const backupPath = `${applicationsFile}.backup`;
        if (fs.existsSync(backupPath)) {
            try {
                console.log('尝试从备份文件恢复申请数据...');
                const backupData = fs.readFileSync(backupPath, 'utf8');

                if (backupData && backupData.trim() !== '') {
                    const backupApplications = JSON.parse(backupData);

                    // 验证备份数据完整性
                    if (validateApplicationsData(backupApplications)) {
                        // 恢复主文件
                        fs.writeFileSync(applicationsFile, backupData);
                        console.log('已从备份文件成功恢复申请数据');

                        cache.applications = backupApplications;
                        cache.lastApplicationUpdate = now;
                        return cache.applications;
                    } else {
                        console.error('备份文件数据验证失败');
                    }
                } else {
                    console.error('备份文件为空');
                }
            } catch (backupError) {
                console.error('从备份文件恢复失败:', backupError);
            }
        } else {
            console.error('备份文件不存在');
        }

        // 如果所有恢复尝试都失败，返回空数组
        console.error('无法恢复申请数据，返回空数组');
        cache.applications = [];
        cache.lastApplicationUpdate = now;
        return [];
    }
}

// 手动恢复申请数据工具函数
function recoverApplicationsFromBackup() {
    const backupPath = `${applicationsFile}.backup`;

    if (!fs.existsSync(backupPath)) {
        console.error('备份文件不存在，无法恢复');
        return false;
    }

    try {
        console.log('开始手动恢复申请数据...');
        const backupData = fs.readFileSync(backupPath, 'utf8');

        if (!backupData || backupData.trim() === '') {
            console.error('备份文件为空，无法恢复');
            return false;
        }

        const backupApplications = JSON.parse(backupData);

        // 验证备份数据完整性
        if (!validateApplicationsData(backupApplications)) {
            console.error('备份数据验证失败，无法恢复');
            return false;
        }

        // 创建当前文件的备份（如果存在且有效）
        if (fs.existsSync(applicationsFile)) {
            try {
                const currentData = fs.readFileSync(applicationsFile, 'utf8');
                if (currentData && currentData.trim() !== '') {
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const emergencyBackupPath = `${applicationsFile}.emergency-backup-${timestamp}`;
                    fs.writeFileSync(emergencyBackupPath, currentData);
                    console.log(`当前文件已备份到: ${emergencyBackupPath}`);
                }
            } catch (error) {
                console.warn('创建紧急备份失败:', error.message);
            }
        }

        // 恢复数据
        fs.writeFileSync(applicationsFile, backupData);

        // 清除缓存，强制重新读取
        cache.applications = null;
        cache.lastApplicationUpdate = 0;

        console.log(`成功恢复 ${backupApplications.length} 条申请记录`);
        return true;

    } catch (error) {
        console.error('手动恢复申请数据失败:', error);
        return false;
    }
}

// 检查磁盘空间（单位：MB）
function checkDiskSpace(filePath, requiredSizeMB) {
    try {
        const stats = fs.statSync(path.dirname(filePath));
        // 简单的磁盘空间检查：确保有足够的空间（至少是所需空间的2倍）
        return true; // 在实际环境中，这里应该实现真正的磁盘空间检查
    } catch (error) {
        console.error('检查磁盘空间失败:', error);
        return false;
    }
}

// 验证JSON数据完整性
function validateApplicationsData(applications) {
    try {
        // 基本类型检查
        if (!Array.isArray(applications)) {
            throw new Error('申请数据必须是数组格式');
        }

        // 检查每个申请的必要字段
        for (let i = 0; i < applications.length; i++) {
            const app = applications[i];
            if (!app || typeof app !== 'object') {
                throw new Error(`申请记录 ${i} 不是有效的对象`);
            }

            // 检查必要字段
            const requiredFields = ['id', 'applicant', 'department', 'date', 'content', 'status'];
            for (const field of requiredFields) {
                if (!app.hasOwnProperty(field)) {
                    throw new Error(`申请记录 ${i} 缺少必要字段: ${field}`);
                }
            }

            // 检查ID是否为数字
            if (typeof app.id !== 'number' || app.id <= 0) {
                throw new Error(`申请记录 ${i} 的ID无效: ${app.id}`);
            }
        }

        return true;
    } catch (error) {
        console.error('申请数据验证失败:', error.message);
        return false;
    }
}

// 保存申请数据（更新缓存）- 立即响应优化版
function saveApplications(applications) {
    try {
        // 数据完整性验证
        if (!validateApplicationsData(applications)) {
            console.error('申请数据验证失败，拒绝保存');
            return false;
        }

        // 立即更新缓存，提供快速响应
        cache.applications = applications;
        cache.lastApplicationUpdate = Date.now();

        // 异步写入文件，不阻塞响应
        setImmediate(() => {
            try {
                // 检查数据大小
                const jsonData = JSON.stringify(applications, null, 2);
                const dataSizeInMB = Buffer.byteLength(jsonData) / (1024 * 1024);

                console.log(`异步保存申请数据: ${applications.length}个申请, 数据大小: ${dataSizeInMB.toFixed(2)}MB`);

                // 如果数据过大，可能会导致写入问题
                if (dataSizeInMB > 50) {
                    console.warn(`申请数据过大 (${dataSizeInMB.toFixed(2)}MB)，可能导致性能问题`);
                }

                // 检查磁盘空间
                if (!checkDiskSpace(applicationsFile, dataSizeInMB)) {
                    throw new Error('磁盘空间不足，无法保存申请数据');
                }

                // 创建备份
                const backupPath = `${applicationsFile}.backup`;
                if (fs.existsSync(applicationsFile)) {
                    fs.copyFileSync(applicationsFile, backupPath);
                }

                // 写入新数据
                fs.writeFileSync(applicationsFile, jsonData);

                console.log('申请数据已异步保存到文件');
            } catch (error) {
                console.error('异步保存申请数据失败:', error);

                // 尝试从备份恢复
                const backupPath = `${applicationsFile}.backup`;
                if (fs.existsSync(backupPath)) {
                    try {
                        fs.copyFileSync(backupPath, applicationsFile);
                        console.log('已从备份恢复申请数据');
                    } catch (backupError) {
                        console.error('从备份恢复失败:', backupError);
                    }
                }
            }
        });

        return true;
    } catch (error) {
        console.error('更新申请缓存失败:', error);
        return false;
    }
}

// 同步保存申请数据（用于关键操作）
function saveApplicationsSync(applications) {
    try {
        // 数据完整性验证
        if (!validateApplicationsData(applications)) {
            console.error('申请数据验证失败，拒绝保存');
            return false;
        }

        // 检查数据大小
        const jsonData = JSON.stringify(applications, null, 2);
        const dataSizeInMB = Buffer.byteLength(jsonData) / (1024 * 1024);

        console.log(`同步保存申请数据: ${applications.length}个申请, 数据大小: ${dataSizeInMB.toFixed(2)}MB`);

        // 如果数据过大，可能会导致写入问题
        if (dataSizeInMB > 50) {
            console.error(`申请数据过大 (${dataSizeInMB.toFixed(2)}MB)，可能导致性能问题`);
        }

        // 检查磁盘空间
        if (!checkDiskSpace(applicationsFile, dataSizeInMB)) {
            throw new Error('磁盘空间不足，无法保存申请数据');
        }

        // 创建备份
        const backupPath = `${applicationsFile}.backup`;
        if (fs.existsSync(applicationsFile)) {
            fs.copyFileSync(applicationsFile, backupPath);
        }

        // 写入新数据
        fs.writeFileSync(applicationsFile, jsonData);

        // 更新缓存
        cache.applications = applications;
        cache.lastApplicationUpdate = Date.now();

        return true;
    } catch (error) {
        console.error('同步保存申请数据失败:', error);

        // 尝试从备份恢复
        const backupPath = `${applicationsFile}.backup`;
        if (fs.existsSync(backupPath)) {
            try {
                fs.copyFileSync(backupPath, applicationsFile);
                console.log('已从备份恢复申请数据');
            } catch (backupError) {
                console.error('从备份恢复失败:', backupError);
            }
        }

        return false;
    }
}

// ==================== 归档数据管理 ====================
// 注意：archiveDataDir 已在文件顶部定义（第179行）

// 加载归档数据（按需加载，支持时间范围筛选）
function loadArchivedApplications(options = {}) {
    try {
        const { startDate, endDate, includeAll = false } = options;

        // 检查缓存（仅对includeAll的情况使用缓存）
        const now = Date.now();
        if (includeAll && cache.archivedApplications && (now - cache.lastArchivedUpdate < cache.cacheTTL)) {
            // 使用缓存，不打印日志
            return cache.archivedApplications;
        }

        // 如果不存在归档目录，返回空数组
        if (!fs.existsSync(archiveDataDir)) {
            return [];
        }

        const archivedApps = [];
        const archiveFiles = fs.readdirSync(archiveDataDir).filter(f => f.endsWith('.json'));
        let shouldLog = false; // 标记是否需要打印日志

        // 如果需要加载所有归档数据
        if (includeAll) {
            archiveFiles.forEach(file => {
                try {
                    const filePath = path.join(archiveDataDir, file);
                    const data = fs.readFileSync(filePath, 'utf8');
                    const apps = JSON.parse(data);
                    if (Array.isArray(apps)) {
                        archivedApps.push(...apps);
                    }
                } catch (error) {
                    console.error(`读取归档文件 ${file} 失败:`, error);
                }
            });

            // 只在首次加载或数据变化时打印日志
            if (!cache.archivedApplications || archivedApps.length !== cache.archivedApplications.length) {
                shouldLog = true;
            }

            // 更新缓存
            cache.archivedApplications = archivedApps;
            cache.lastArchivedUpdate = now;

        } else if (startDate || endDate) {
            // 根据日期范围加载归档数据（不使用缓存）
            const start = startDate ? new Date(startDate) : new Date('2000-01-01');
            const end = endDate ? new Date(endDate) : new Date();

            archiveFiles.forEach(file => {
                try {
                    const filePath = path.join(archiveDataDir, file);
                    const data = fs.readFileSync(filePath, 'utf8');
                    const apps = JSON.parse(data);

                    if (Array.isArray(apps)) {
                        // 筛选符合日期范围的申请
                        const filteredApps = apps.filter(app => {
                            const appDate = new Date(app.date);
                            return appDate >= start && appDate <= end;
                        });
                        archivedApps.push(...filteredApps);
                    }
                } catch (error) {
                    console.error(`读取归档文件 ${file} 失败:`, error);
                }
            });
        }

        // 打印日志
        if (shouldLog) {
            console.log(`加载归档数据: ${archivedApps.length}个申请`);
        }

        return archivedApps;
    } catch (error) {
        console.error('加载归档数据失败:', error);
        return [];
    }
}

// 获取所有申请（活跃数据 + 归档数据）
function getAllApplications(options = {}) {
    try {
        // 获取活跃数据
        const activeApps = getApplications();

        // 获取归档数据（已经有缓存机制，不会重复加载）
        const archivedApps = loadArchivedApplications(options);

        // 合并并返回
        const allApps = [...activeApps, ...archivedApps];

        return allApps;
    } catch (error) {
        console.error('获取所有申请失败:', error);
        // 出错时至少返回活跃数据
        return getApplications();
    }
}

// 自动归档旧申请（归档3个月前的已完成申请）
function archiveOldApplications() {
    try {
        console.log('开始自动归档旧申请...');

        // 清除缓存，确保读取最新数据
        cache.applications = null;
        cache.lastApplicationUpdate = 0;

        const applications = getApplications();
        console.log(`当前申请总数: ${applications.length}`);

        const now = new Date();
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        console.log(`当前日期: ${now.toISOString().split('T')[0]}`);
        console.log(`3个月前日期: ${threeMonthsAgo.toISOString().split('T')[0]}`);

        // 统计已完成申请
        const completedApps = applications.filter(app => app.status === '已通过' || app.status === '已拒绝');
        console.log(`已完成申请数: ${completedApps.length}`);

        // 筛选需要归档的申请：已完成且超过3个月
        const toArchive = applications.filter(app => {
            const isFinal = app.status === '已通过' || app.status === '已拒绝';
            const appDate = new Date(app.date);
            const isOld = appDate < threeMonthsAgo;
            return isFinal && isOld;
        });

        console.log(`需要归档的申请数: ${toArchive.length}`);

        if (toArchive.length === 0) {
            console.log('没有需要归档的申请');
            return { success: true, archivedCount: 0, remainingCount: applications.length };
        }

        console.log(`找到${toArchive.length}个需要归档的申请`);

        // 按月份分组
        const groupedByMonth = {};
        toArchive.forEach(app => {
            const appDate = new Date(app.date);
            const monthKey = `${appDate.getFullYear()}-${String(appDate.getMonth() + 1).padStart(2, '0')}`;

            if (!groupedByMonth[monthKey]) {
                groupedByMonth[monthKey] = [];
            }
            groupedByMonth[monthKey].push(app);
        });

        // 保存到归档文件
        let archivedCount = 0;
        for (const [monthKey, apps] of Object.entries(groupedByMonth)) {
            const archiveFile = path.join(archiveDataDir, `${monthKey}.json`);

            // 如果归档文件已存在，合并数据
            let existingApps = [];
            if (fs.existsSync(archiveFile)) {
                try {
                    const data = fs.readFileSync(archiveFile, 'utf8');
                    existingApps = JSON.parse(data);
                } catch (error) {
                    console.error(`读取现有归档文件 ${monthKey}.json 失败:`, error);
                }
            }

            // 合并并去重（基于ID）
            const existingIds = new Set(existingApps.map(a => a.id));
            const newApps = apps.filter(a => !existingIds.has(a.id));
            const mergedApps = [...existingApps, ...newApps];

            // 保存归档文件
            fs.writeFileSync(archiveFile, JSON.stringify(mergedApps, null, 2));
            console.log(`归档${newApps.length}个申请到 ${monthKey}.json`);
            archivedCount += newApps.length;
        }

        // 从主文件中移除已归档的申请
        const archivedIds = new Set(toArchive.map(a => a.id));
        const remainingApps = applications.filter(app => !archivedIds.has(app.id));

        // 保存更新后的主文件
        const saveResult = saveApplicationsSync(remainingApps);

        if (saveResult) {
            // 清除归档数据缓存，强制下次重新加载
            cache.archivedApplications = null;
            cache.lastArchivedUpdate = 0;

            console.log(`归档完成: 归档${archivedCount}个申请，主文件剩余${remainingApps.length}个申请`);
            return { success: true, archivedCount, remainingCount: remainingApps.length };
        } else {
            console.error('保存主文件失败，归档操作回滚');
            return { success: false, message: '保存主文件失败' };
        }
    } catch (error) {
        console.error('自动归档失败:', error);
        return { success: false, message: error.message };
    }
}

// ==================== 提醒设置管理 ====================

// 读取提醒设置
function getReminderSettings() {
    try {
        const data = fs.readFileSync(reminderSettingsFile);
        return JSON.parse(data);
    } catch (error) {
        console.error('读取提醒设置失败:', error);
        // 返回默认设置
        return {
            priority: {
                high: {
                    initialDelay: 4,
                    normalInterval: 4,
                    mediumInterval: 2,
                    urgentInterval: 1
                },
                medium: {
                    initialDelay: 8,
                    normalInterval: 8,
                    mediumInterval: 4,
                    urgentInterval: 2
                },
                low: {
                    initialDelay: 12,
                    normalInterval: 12,
                    mediumInterval: 6,
                    urgentInterval: 3
                }
            },
            timeControl: {
                workingDays: {
                    enabled: false,
                    days: [1, 2, 3, 4, 5], // 1=周一, 2=周二, ..., 7=周日
                    startTime: "09:00",
                    endTime: "18:00"
                },
                customDates: {
                    enabled: false,
                    skipDates: []
                }
            }
        };
    }
}

// 保存提醒设置
function saveReminderSettings(settings) {
    try {
        fs.writeFileSync(reminderSettingsFile, JSON.stringify(settings, null, 2));
        return true;
    } catch (error) {
        console.error('保存提醒设置失败:', error);
        return false;
    }
}

// 检查当前时间是否允许发送提醒
function isReminderTimeAllowed(timeControl) {
    const now = new Date();

    // 检查工作日和工作时间
    if (timeControl.workingDays && timeControl.workingDays.enabled) {
        const dayOfWeek = now.getDay(); // 0=周日, 1=周一, ..., 6=周六
        const workingDays = timeControl.workingDays.days || [];

        // 转换周日从0到7，保持一致性
        const currentDay = dayOfWeek === 0 ? 7 : dayOfWeek;

        // 检查是否在工作日
        if (!workingDays.includes(currentDay)) {
            return false;
        }

        // 检查工作时间
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM格式
        const startTime = timeControl.workingDays.startTime;
        const endTime = timeControl.workingDays.endTime;

        if (currentTime < startTime || currentTime > endTime) {
            return false;
        }
    }

    // 检查自定义跳过日期
    if (timeControl.customDates && timeControl.customDates.enabled && timeControl.customDates.skipDates.length > 0) {
        const currentDate = now.toISOString().slice(0, 10); // YYYY-MM-DD格式
        if (timeControl.customDates.skipDates.includes(currentDate)) {
            return false;
        }
    }

    return true;
}

// 严格验证申请数据的所有必填字段
function validateApplicationData(application) {
    const errors = [];

    // 验证申请人姓名
    if (!application.applicant || typeof application.applicant !== 'string' || application.applicant.trim() === '') {
        errors.push('申请人姓名不能为空');
    } else if (application.applicant.trim().length < 2) {
        errors.push('申请人姓名至少需要2个字符');
    } else if (application.applicant.trim().length > 50) {
        errors.push('申请人姓名不能超过50个字符');
    }

    // 验证申请部门
    if (!application.department || typeof application.department !== 'string' || application.department.trim() === '') {
        errors.push('申请部门不能为空');
    }

    // 验证申请日期
    if (!application.date || typeof application.date !== 'string' || application.date.trim() === '') {
        errors.push('申请日期不能为空');
    } else {
        // 验证日期格式和合理性
        const selectedDate = new Date(application.date);
        const today = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(today.getFullYear() - 1);
        const oneYearLater = new Date();
        oneYearLater.setFullYear(today.getFullYear() + 1);

        if (isNaN(selectedDate.getTime())) {
            errors.push('申请日期格式无效');
        } else if (selectedDate < oneYearAgo) {
            errors.push('申请日期不能早于一年前');
        } else if (selectedDate > oneYearLater) {
            errors.push('申请日期不能晚于一年后');
        }
    }

    // 验证申请内容
    if (!application.content || typeof application.content !== 'string' || application.content.trim() === '') {
        errors.push('申请内容不能为空');
    } else if (application.content.trim().length < 10) {
        errors.push('申请内容至少需要10个字符');
    } else if (application.content.trim().length > 2000) {
        errors.push('申请内容不能超过2000个字符');
    }

    // 验证金额（如果填写了）
    if (application.amount !== null && application.amount !== undefined && application.amount !== '') {
        if (typeof application.amount === 'string' && application.amount.trim() !== '') {
            const amountNum = parseFloat(application.amount);
            if (isNaN(amountNum)) {
                errors.push('申请金额必须是有效数字');
            } else if (amountNum < 0) {
                errors.push('申请金额不能为负数');
            } else if (amountNum > 99999999) {
                errors.push('申请金额不能超过99,999,999');
            }
        } else if (typeof application.amount === 'number') {
            if (application.amount < 0) {
                errors.push('申请金额不能为负数');
            } else if (application.amount > 99999999) {
                errors.push('申请金额不能超过99,999,999');
            }
        }
    }

    // 验证优先级
    if (!application.priority || typeof application.priority !== 'string' || application.priority.trim() === '') {
        errors.push('请选择申请优先级');
    } else {
        const validPriorities = ['normal', 'medium', 'high'];
        if (!validPriorities.includes(application.priority)) {
            errors.push('申请优先级值无效');
        }
    }

    // 验证币种（如果提供了）
    if (application.currency && typeof application.currency === 'string' && application.currency.trim() !== '') {
        const validCurrencies = ['CNY', 'USD'];
        if (!validCurrencies.includes(application.currency)) {
            errors.push('币种值无效');
        }
    }

    // 验证用户名
    if (!application.username || typeof application.username !== 'string' || application.username.trim() === '') {
        errors.push('用户名不能为空');
    }

    // 验证附件（如果有）
    if (application.attachments && Array.isArray(application.attachments)) {
        if (application.attachments.length > 10) {
            errors.push('附件数量不能超过10个');
        }

        application.attachments.forEach((attachment, index) => {
            if (!attachment.name || typeof attachment.name !== 'string' || attachment.name.trim() === '') {
                errors.push(`第${index + 1}个附件名称无效`);
            }
            if (!attachment.path || typeof attachment.path !== 'string' || attachment.path.trim() === '') {
                errors.push(`第${index + 1}个附件路径无效`);
            }
        });
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// 严格验证添加用户数据的所有必填字段
function validateAddUserData(userData) {
    const errors = [];
    const { username, password, role, email, userCode, canSubmitApplication } = userData;

    // 验证用户名
    if (!username || typeof username !== 'string' || username.trim() === '') {
        errors.push('用户名不能为空');
    } else if (username.trim().length < 3) {
        errors.push('用户名至少需要3个字符');
    } else if (username.trim().length > 20) {
        errors.push('用户名不能超过20个字符');
    }

    // 验证密码 - 只验证密码至少6位数
    if (!password || typeof password !== 'string' || password.trim() === '') {
        errors.push('密码不能为空');
    } else if (password.length < 6) {
        errors.push('密码至少需要6个字符');
    } else if (password.length > 50) {
        errors.push('密码不能超过50个字符');
    }

    // 验证角色
    if (!role || typeof role !== 'string' || role.trim() === '') {
        errors.push('请选择用户角色');
    } else {
        const validRoles = ['user', 'director', 'chief', 'manager', 'ceo', 'admin', 'readonly'];
        if (!validRoles.includes(role)) {
            errors.push('用户角色值无效');
        }
    }

    // 验证邮箱（如果填写了）
    if (email && typeof email === 'string' && email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            errors.push('邮箱地址格式无效');
        }
    }

    // 验证用户编号（如果填写了）
    if (userCode && typeof userCode === 'string' && userCode.trim() !== '') {
        if (userCode.trim().length > 20) {
            errors.push('用户编号不能超过20个字符');
        }
        if (!/^[A-Za-z0-9]{6}$/.test(userCode.trim())) {
            errors.push('用户代码必须是6位字母或数字组合');
        }
    }

    // 验证申请权限（可选字段，默认为false）
    if (canSubmitApplication !== undefined && typeof canSubmitApplication !== 'boolean') {
        errors.push('申请权限设置无效');
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// 严格验证更新用户数据的字段
function validateUpdateUserData(userData) {
    const errors = [];
    const { newRole, email, userCode, newPassword, canSubmitApplication } = userData;

    // 验证角色
    if (!newRole || typeof newRole !== 'string' || newRole.trim() === '') {
        errors.push('请选择用户角色');
    } else {
        const validRoles = ['user', 'director', 'chief', 'manager', 'ceo', 'admin', 'readonly'];
        if (!validRoles.includes(newRole)) {
            errors.push('用户角色值无效');
        }
    }

    // 验证邮箱
    if (!email || typeof email !== 'string' || email.trim() === '') {
        errors.push('邮箱地址不能为空');
    } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            errors.push('邮箱地址格式无效');
        }
    }

    // 验证用户编号（如果填写了）
    if (userCode && typeof userCode === 'string' && userCode.trim() !== '') {
        if (userCode.trim().length > 20) {
            errors.push('用户编号不能超过20个字符');
        }
        if (!/^[A-Za-z0-9]{6}$/.test(userCode.trim())) {
            errors.push('用户代码必须是6位字母或数字组合');
        }
    }

    // 验证新密码（如果提供了）
    if (newPassword && typeof newPassword === 'string') {
        if (newPassword.length < 6) {
            errors.push('新密码至少需要6个字符');
        } else if (newPassword.length > 50) {
            errors.push('新密码不能超过50个字符');
        }
    }

    // 验证申请权限（可选字段）
    if (canSubmitApplication !== undefined && typeof canSubmitApplication !== 'boolean') {
        errors.push('申请权限设置无效');
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// 文件上传配置
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, `${uniqueSuffix}-${originalName}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: NETWORK_CONFIG.maxFileSize }, // 限制文件大小
    fileFilter: (req, file, cb) => {
        const filetypes = new RegExp(`\\.(${NETWORK_CONFIG.allowedFileTypes.join('|')})$`, 'i');
        const mimetypes = [
            'application/pdf' // 只允许PDF格式
        ];
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = mimetypes.includes(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error(`只允许上传 ${NETWORK_CONFIG.allowedFileTypes.join(', ').toUpperCase()} 文件`));
        }
    }
});

// 用户注册接口
app.post('/register', (req, res) => {
    const { username, password, email } = req.body;
    let users = getUsers();
    if (users.find(u => u.username === username)) {
        return res.json({ success: false, message: '用户名已存在' });
    }
    users.push({ username, password, role: 'user', email });
    saveUsers(users);
    res.json({ success: true, message: '注册成功，请登录' });
});

// 用户登录接口
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // 验证登录数据
    if (!username || typeof username !== 'string' || username.trim() === '') {
        return res.status(400).json({ success: false, message: '用户名不能为空' });
    }
    if (!password || typeof password !== 'string' || password.trim() === '') {
        return res.status(400).json({ success: false, message: '密码不能为空' });
    }

    const users = getUsers();

    // 首先尝试通过用户名和密码登录
    let user = users.find(u => u.username === username && u.password === password);

    // 如果用户名和密码登录失败，尝试通过用户代码和密码登录
    if (!user) {
        user = users.find(u => u.userCode === username && u.password === password);
    }

    if (user) {
        res.json({
            success: true,
            message: '登录成功',
            username: user.username,
            role: user.role,
            department: user.department,
            canSubmitApplication: user.canSubmitApplication || false
        });
    } else {
        res.json({ success: false, message: '账号或密码错误' });
    }
});

// 用户修改密码接口
app.post('/changePassword', (req, res) => {
    const { username, currentPassword, newPassword } = req.body;

    // 验证修改密码的数据
    if (!username || typeof username !== 'string' || username.trim() === '') {
        return res.status(400).json({ success: false, message: '用户名不能为空' });
    }
    if (!currentPassword || typeof currentPassword !== 'string' || currentPassword.trim() === '') {
        return res.status(400).json({ success: false, message: '当前密码不能为空' });
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim() === '') {
        return res.status(400).json({ success: false, message: '新密码不能为空' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: '新密码至少需要6个字符' });
    }
    if (newPassword.length > 50) {
        return res.status(400).json({ success: false, message: '新密码不能超过50个字符' });
    }

    // 添加调试日志
    console.log(`修改密码请求: 用户=${username}`);

    try {
        let users = getUsers();

        // 查找用户并验证当前密码
        // 首先尝试通过用户名和密码验证
        let userIndex = users.findIndex(u => u.username === username && u.password === currentPassword);

        // 如果通过用户名找不到，尝试通过用户代码验证
        if (userIndex === -1) {
            userIndex = users.findIndex(u => u.userCode === username && u.password === currentPassword);
        }

        if (userIndex === -1) {
            console.log('密码修改失败: 用户不存在或当前密码错误');
            return res.json({ success: false, message: '当前密码错误' });
        }

        // 确保新密码不为空
        if (!newPassword || newPassword.trim() === '') {
            console.log('密码修改失败: 新密码不能为空');
            return res.json({ success: false, message: '新密码不能为空' });
        }

        // 更新密码
        users[userIndex].password = newPassword;

        // 保存用户数据
        console.log('正在保存用户数据...');
        const saveResult = saveUsers(users);
        if (!saveResult) {
            console.log('保存用户数据失败');
            return res.json({ success: false, message: '保存用户数据失败' });
        }

        // 获取真实用户名（如果使用了用户代码登录）
        const realUsername = users[userIndex].username;
        console.log(`用户 ${realUsername} 的密码已成功修改`);
        res.json({ success: true, message: '密码修改成功，请使用新密码重新登录' });
    } catch (error) {
        console.error('修改密码时发生错误:', error);
        res.status(500).json({ success: false, message: '服务器错误: ' + error.message });
    }
});

// 管理员添加用户接口
app.post('/addUser', (req, res) => {
    const { adminUsername, username, password, role, email, department, userCode, signature, canSubmitApplication } = req.body;
    let users = getUsers();

    // 验证管理员权限
    const admin = users.find(u => u.username === adminUsername);
    if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ success: false, message: '权限不足，只有管理员可以添加用户' });
    }

    // 严格验证添加用户的数据
    const addUserValidationResult = validateAddUserData({ username, password, role, email, userCode, canSubmitApplication });
    if (!addUserValidationResult.isValid) {
        console.log('添加用户数据验证失败:', addUserValidationResult.errors);
        return res.status(400).json({
            success: false,
            message: '数据验证失败：' + addUserValidationResult.errors.join('; ')
        });
    }

    // 检查用户名是否已存在
    if (users.find(u => u.username === username)) {
        return res.json({ success: false, message: '用户名已存在' });
    }

    // 检查用户代码是否已存在
    if (userCode && users.find(u => u.userCode === userCode)) {
        return res.json({ success: false, message: '用户代码已存在' });
    }

    // 验证用户代码格式
    if (userCode && !/^[A-Za-z0-9]{6}$/.test(userCode)) {
        return res.json({ success: false, message: '用户代码必须是6位字母或数字组合' });
    }

    // 设置用户部门，允许管理员自由设置
    let finalDepartment = department;

    // 设置申请权限，如果未指定则根据角色设置默认值
    let finalCanSubmitApplication = canSubmitApplication;
    if (finalCanSubmitApplication === undefined) {
        finalCanSubmitApplication = ['user', 'director', 'admin'].includes(role);
    }

    users.push({
        username,
        password,
        role,
        email,
        department: finalDepartment,
        userCode,
        signature,
        canSubmitApplication: finalCanSubmitApplication
    });
    saveUsers(users);
    res.json({ success: true, message: '用户添加成功' });
});

// 获取所有用户信息（仅管理员）
app.get('/users', (req, res) => {
    const { username } = req.query;
    const users = getUsers();

    // 检查权限
    const adminUser = users.find(u => u.username === username);
    if (adminUser && adminUser.role === 'admin') {
        res.json(users);
    } else {
        res.status(403).json({ success: false, message: '权限不足' });
    }
});

// 获取所有用户的签名数据（所有已登录用户可访问）- 保留兼容性
app.get('/signatures', (req, res) => {
    const { username } = req.query;
    const users = getUsers();

    // 检查是否是已登录用户
    const requestingUser = users.find(u => u.username === username);
    if (requestingUser) {
        // 只返回用户名、角色、部门和签名数据，不包含密码等敏感信息
        const signatures = users.map(user => {
            // 使用用户设置的部门信息
            let department = user.department;

            return {
                username: user.username,
                role: user.role,
                department: department,
                userCode: user.userCode,
                signature: user.signature
            };
        });
        res.json(signatures);
    } else {
        res.status(403).json({ success: false, message: '请先登录' });
    }
});

// 获取单个用户签名（优化版）
app.get('/user-signature', (req, res) => {
    const { username, requestUser } = req.query;
    const users = getUsers();

    // 检查请求用户是否已登录
    const requestingUser = users.find(u => u.username === requestUser);
    if (!requestingUser) {
        return res.status(403).json({ success: false, message: '请先登录' });
    }

    // 查找目标用户
    const targetUser = users.find(u => u.username === username);
    if (targetUser) {
        res.json({
            username: targetUser.username,
            signature: targetUser.signature || null
        });
    } else {
        res.json({
            username: username,
            signature: null
        });
    }
});

// 批量获取用户签名（优化版）
app.get('/batch-signatures', (req, res) => {
    const { usernames, requestUser } = req.query;
    const users = getUsers();

    // 检查请求用户是否已登录
    const requestingUser = users.find(u => u.username === requestUser);
    if (!requestingUser) {
        return res.status(403).json({ success: false, message: '请先登录' });
    }

    if (!usernames) {
        return res.json({ signatures: {} });
    }

    const usernameList = usernames.split(',');
    const signatures = {};

    usernameList.forEach(username => {
        const user = users.find(u => u.username === username);
        signatures[username] = user ? (user.signature || null) : null;
    });

    res.json({ signatures });
});

// 更新用户角色和邮箱（仅管理员）
app.post('/updateUser', (req, res) => {
    const { adminUsername, targetUsername, newRole, email, department, userCode, signature, newPassword, canSubmitApplication } = req.body;

    // 添加调试日志
    console.log(`更新用户请求: 管理员=${adminUsername}, 目标用户=${targetUsername}`);
    console.log(`更新数据: 角色=${newRole}, 部门=${department}, 用户代码=${userCode}`);
    console.log(`签名数据长度: ${signature ? signature.length : 0}`);
    console.log(`是否更新密码: ${newPassword ? '是' : '否'}`);

    try {
        let users = getUsers();

        // 检查权限
        const adminUser = users.find(u => u.username === adminUsername);
        if (!adminUser || adminUser.role !== 'admin') {
            console.log('权限不足: 用户不是管理员');
            return res.status(403).json({ success: false, message: '权限不足' });
        }

        // 验证更新用户的数据
        const updateUserValidationResult = validateUpdateUserData({ newRole, email, userCode, newPassword, canSubmitApplication });
        if (!updateUserValidationResult.isValid) {
            console.log('更新用户数据验证失败:', updateUserValidationResult.errors);
            return res.status(400).json({
                success: false,
                message: '数据验证失败：' + updateUserValidationResult.errors.join('; ')
            });
        }

        const userIndex = users.findIndex(u => u.username === targetUsername);
        if (userIndex === -1) {
            console.log('用户不存在');
            return res.json({ success: false, message: '用户不存在' });
        }

        // 检查用户代码是否已存在（排除当前用户）
        if (userCode && users.some(u => u.userCode === userCode && u.username !== targetUsername)) {
            console.log('用户代码已存在');
            return res.json({ success: false, message: '用户代码已存在' });
        }

        // 验证用户代码格式
        if (userCode && !/^[A-Za-z0-9]{6}$/.test(userCode)) {
            console.log('用户代码格式无效');
            return res.json({ success: false, message: '用户代码必须是6位字母或数字组合' });
        }

        // 记录原始角色，用于处理历史审批记录
        const originalRole = users[userIndex].role;

        // 更新用户信息，允许管理员自由设置部门
        users[userIndex].role = newRole;
        users[userIndex].email = email;
        users[userIndex].department = department;

        users[userIndex].userCode = userCode;

        // 更新申请权限
        if (canSubmitApplication !== undefined) {
            users[userIndex].canSubmitApplication = canSubmitApplication;
        }

        // 如果提供了新密码，则更新密码
        if (newPassword) {
            users[userIndex].password = newPassword;
            console.log(`用户 ${targetUsername} 的密码已更新`);
        }

        // 处理角色变更时的历史审批记录保留
        if (originalRole !== newRole) {
            console.log(`用户 ${targetUsername} 角色从 ${originalRole} 变更为 ${newRole}，开始处理历史审批记录`);
            handleRoleChangeApprovalHistory(targetUsername, originalRole, newRole);
        }

        // 如果提供了新的签名，则更新签名
        if (signature) {
            try {
                // 验证签名数据格式
                if (typeof signature !== 'string') {
                    console.log('签名数据类型无效:', typeof signature);
                    return res.json({ success: false, message: '签名数据类型无效' });
                }

                if (!signature.startsWith('data:image/')) {
                    console.log('签名数据格式无效: 不是图片数据');
                    return res.json({ success: false, message: '签名数据格式无效，请使用图片文件' });
                }

                // 检查签名数据大小
                const dataSizeInKB = Math.round(signature.length / 1024);
                console.log(`签名数据大小: ${dataSizeInKB}KB`);

                if (signature.length > 5000000) { // 如果大于5MB
                    console.log('签名数据过大:', signature.length, '字节');
                    return res.json({ success: false, message: '签名图片过大，请使用小于5MB的图片' });
                }

                // 更新签名
                users[userIndex].signature = signature;
                console.log('签名数据已更新');
            } catch (signatureError) {
                console.error('处理签名数据时出错:', signatureError);
                return res.json({ success: false, message: '处理签名数据失败: ' + signatureError.message });
            }
        }

        // 保存用户数据
        console.log('正在保存用户数据...');
        const saveResult = saveUsers(users);
        if (!saveResult) {
            console.log('保存用户数据失败');
            return res.json({ success: false, message: '保存用户数据失败' });
        }

        console.log('用户更新成功');
        res.json({ success: true, message: '用户更新成功' });
    } catch (error) {
        console.error('更新用户时发生错误:', error);
        res.status(500).json({ success: false, message: '服务器错误: ' + error.message });
    }
});

// 快速更新用户接口（立即响应版）
app.post('/updateUserFast', (req, res) => {
    const { adminUsername, targetUsername, newRole, email, department, userCode, signature, newPassword, canSubmitApplication } = req.body;

    // 添加调试日志
    console.log(`快速更新用户请求: 管理员=${adminUsername}, 目标用户=${targetUsername}`);

    try {
        let users = getUsers();

        // 检查权限
        const adminUser = users.find(u => u.username === adminUsername);
        if (!adminUser || adminUser.role !== 'admin') {
            console.log('权限不足: 用户不是管理员');
            return res.status(403).json({ success: false, message: '权限不足' });
        }

        // 验证更新用户的数据
        const updateUserValidationResult = validateUpdateUserData({ newRole, email, userCode, newPassword, canSubmitApplication });
        if (!updateUserValidationResult.isValid) {
            console.log('更新用户数据验证失败:', updateUserValidationResult.errors);
            return res.status(400).json({
                success: false,
                message: '数据验证失败：' + updateUserValidationResult.errors.join('; ')
            });
        }

        const userIndex = users.findIndex(u => u.username === targetUsername);
        if (userIndex === -1) {
            console.log('用户不存在');
            return res.json({ success: false, message: '用户不存在' });
        }

        // 检查用户代码是否已存在（排除当前用户）
        if (userCode && users.some(u => u.userCode === userCode && u.username !== targetUsername)) {
            console.log('用户代码已存在');
            return res.json({ success: false, message: '用户代码已存在' });
        }

        // 验证用户代码格式
        if (userCode && !/^[A-Za-z0-9]{6}$/.test(userCode)) {
            console.log('用户代码格式无效');
            return res.json({ success: false, message: '用户代码必须是6位字母或数字组合' });
        }

        // 记录原始角色，用于处理历史审批记录
        const originalRole = users[userIndex].role;

        // 更新用户信息
        users[userIndex].role = newRole;
        users[userIndex].email = email;
        users[userIndex].department = department;
        users[userIndex].userCode = userCode;

        // 更新申请权限
        if (canSubmitApplication !== undefined) {
            users[userIndex].canSubmitApplication = canSubmitApplication;
        }

        // 如果提供了新密码，则更新密码
        if (newPassword) {
            users[userIndex].password = newPassword;
            console.log(`用户 ${targetUsername} 的密码已更新`);
        }

        // 处理签名数据
        if (signature) {
            try {
                // 验证签名数据格式
                if (typeof signature !== 'string') {
                    console.log('签名数据类型无效:', typeof signature);
                    return res.json({ success: false, message: '签名数据类型无效' });
                }

                if (!signature.startsWith('data:image/')) {
                    console.log('签名数据格式无效: 不是图片数据');
                    return res.json({ success: false, message: '签名数据格式无效，请使用图片文件' });
                }

                // 检查签名数据大小
                if (signature.length > 5000000) { // 如果大于5MB
                    console.log('签名数据过大:', signature.length, '字节');
                    return res.json({ success: false, message: '签名图片过大，请使用小于5MB的图片' });
                }

                // 更新签名
                users[userIndex].signature = signature;
                console.log('签名数据已更新');
            } catch (signatureError) {
                console.error('处理签名数据时出错:', signatureError);
                return res.json({ success: false, message: '处理签名数据失败: ' + signatureError.message });
            }
        }

        // 处理角色变更时的历史审批记录保留
        if (originalRole !== newRole) {
            console.log(`用户 ${targetUsername} 角色从 ${originalRole} 变更为 ${newRole}，开始处理历史审批记录`);
            handleRoleChangeApprovalHistory(targetUsername, originalRole, newRole);
        }

        // 立即响应成功，异步保存数据
        console.log('用户更新成功（快速响应）');
        res.json({ success: true, message: '用户更新成功' });

        // 异步保存用户数据
        const saveResult = saveUsers(users);
        if (!saveResult) {
            console.error('异步保存用户数据失败');
        }

    } catch (error) {
        console.error('快速更新用户时发生错误:', error);
        res.status(500).json({ success: false, message: '服务器错误: ' + error.message });
    }
});

// 删除用户接口（仅管理员）
app.post('/deleteUser', (req, res) => {
    const { adminUsername, targetUsername } = req.body;
    let users = getUsers();

    // 检查权限
    const adminUser = users.find(u => u.username === adminUsername);
    if (!adminUser || adminUser.role !== 'admin') {
        return res.status(403).json({ success: false, message: '权限不足' });
    }

    // 不允许删除自己
    if (adminUsername === targetUsername) {
        return res.json({ success: false, message: '不能删除当前登录的用户' });
    }

    // 查找用户
    const userIndex = users.findIndex(u => u.username === targetUsername);
    if (userIndex === -1) {
        return res.json({ success: false, message: '用户不存在' });
    }

    // 删除用户
    users.splice(userIndex, 1);
    saveUsers(users);

    res.json({ success: true, message: '用户删除成功' });
});

// 文件上传接口
app.post('/upload', upload.array('attachments'), (req, res) => {
    try {
        const files = req.files.map(file => ({
            name: Buffer.from(file.originalname, 'latin1').toString('utf8'),
            path: file.filename
        }));
        res.json({ success: true, files });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 获取美元兑人民币汇率
async function getUSDtoCNYRate() {
    return new Promise((resolve, reject) => {
        // 由于实际环境中可能需要付费API，这里使用固定汇率作为示例
        // 实际应用中可以替换为真实的汇率API
        // 例如: https://api.exchangerate-api.com/v4/latest/USD

        // 模拟API调用延迟
        setTimeout(() => {
            // 使用固定汇率 1 USD = 7.2 CNY 作为示例
            // 实际应用中应该从API获取实时汇率
            const rate = 7.2;
            resolve(rate);
        }, 100);

        // 如果使用真实API，可以使用以下代码
        /*
        https.get('https://api.exchangerate-api.com/v4/latest/USD', (resp) => {
            let data = '';
            resp.on('data', (chunk) => {
                data += chunk;
            });
            resp.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    const rate = response.rates.CNY;
                    resolve(rate);
                } catch (error) {
                    console.error('Error parsing exchange rate data:', error);
                    // 如果API调用失败，使用默认汇率
                    resolve(7.2);
                }
            });
        }).on('error', (error) => {
            console.error('Error fetching exchange rate:', error);
            // 如果API调用失败，使用默认汇率
            resolve(7.2);
        });
        */
    });
}

// 提交申请接口
app.post('/submit', async (req, res) => {
    const application = req.body;

    // 验证用户申请权限
    const users = getUsers();
    const user = users.find(u => u.username === application.username);
    if (!user) {
        return res.status(403).json({
            success: false,
            message: '用户不存在'
        });
    }

    if (!user.canSubmitApplication) {
        return res.status(403).json({
            success: false,
            message: '您没有提交申请的权限，请联系管理员'
        });
    }

    // 严格验证所有必填字段
    const validationResult = validateApplicationData(application);
    if (!validationResult.isValid) {
        console.log('申请数据验证失败:', validationResult.errors);
        return res.status(400).json({
            success: false,
            message: '数据验证失败：' + validationResult.errors.join('; ')
        });
    }

    let applications = getApplications();
    application.id = Date.now();

    // 确保币种字段存在，默认为CNY
    if (!application.currency) {
        application.currency = 'CNY';
    }

    // 如果是美元，获取汇率并计算人民币等值
    if (application.currency === 'USD' && application.amount) {
        try {
            const rate = await getUSDtoCNYRate();
            application.exchangeRate = rate;
            application.cnyEquivalent = parseFloat(application.amount) * rate;
            console.log(`美元金额: ${application.amount}, 汇率: ${rate}, 人民币等值: ${application.cnyEquivalent}`);
        } catch (error) {
            console.error('获取汇率失败:', error);
            // 使用默认汇率
            application.exchangeRate = 7.2;
            application.cnyEquivalent = parseFloat(application.amount) * 7.2;
        }
    }

    // 处理选中的厂长/总监
    const selectedDirectors = application.selectedDirectors || [];
    delete application.selectedDirectors;

    // 初始化审批结构
    application.approvals = {
        directors: {}, // 多个厂长审批
        chief: { status: 'pending', attachments: [] },
        managers: {} // 多个经理审批
    };

    // 初始化提醒相关字段
    application.reminderInfo = {
        lastReminderTime: null, // 上次提醒时间
        reminderCount: 0, // 已发送提醒次数
        escalationLevel: 'normal' // 提醒级别：normal, medium, urgent
    };

    // 生成唯一编号：年月日+序号（在发送邮件之前生成）
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    // 查找今天已有的申请数量，确定序号
    const todayApplications = applications.filter(app => {
        if (!app.applicationCode) return false;
        return app.applicationCode.startsWith(datePrefix);
    });

    // 序号从001开始，根据今天已有的申请数量递增
    const serialNumber = String(todayApplications.length + 1).padStart(3, '0');
    application.applicationCode = `${datePrefix}${serialNumber}`;

    // 检查是否只选择了总监用户
    let directorsList = [];

    // 安全解析selectedDirectors，处理不同的数据格式
    if (selectedDirectors) {
        try {
            if (Array.isArray(selectedDirectors)) {
                // 如果已经是数组，直接使用
                directorsList = selectedDirectors;
            } else if (typeof selectedDirectors === 'string') {
                // 如果是字符串，尝试解析为JSON
                if (selectedDirectors.startsWith('[') && selectedDirectors.endsWith(']')) {
                    // 看起来像JSON数组字符串
                    directorsList = JSON.parse(selectedDirectors);
                } else {
                    // 单个字符串值，转换为数组
                    directorsList = [selectedDirectors];
                }
            }
        } catch (parseError) {
            console.error('解析selectedDirectors失败:', parseError, '原始值:', selectedDirectors);
            // 如果解析失败，尝试将其作为单个值处理
            directorsList = typeof selectedDirectors === 'string' ? [selectedDirectors] : [];
        }
    }
    const selectedOnlyChiefs = directorsList.length > 0 &&
        directorsList.every(director => {
            const user = users.find(u => u.username === director);
            return user && user.role === 'chief';
        });

    // 初始化审批层级时间戳
    application.stageTimestamps = {};

    // 如果只选择了总监，直接设置状态为"待总监审批"，否则为"待厂长审核"
    if (selectedOnlyChiefs) {
        application.status = '待总监审批';
        application.stageTimestamps.chiefStageStartTime = new Date().toISOString();

        // 只添加总监到通知列表
        directorsList.forEach(director => {
            // 总监不需要添加到directors审批列表中
            const user = users.find(u => u.username === director);
            if (user && user.role === 'chief') {
                // 不添加到directors对象中，因为这是给厂长用的
            }
        });
    } else {
        application.status = '待厂长审核';
        application.stageTimestamps.directorStageStartTime = new Date().toISOString();

        // 如果没有选择厂长，默认所有厂长都需要审批
        let directorsToNotify = [];
        if (directorsList.length === 0) {
            const allDirectors = users.filter(user => user.role === 'director').map(user => user.username);
            allDirectors.forEach(director => {
                application.approvals.directors[director] = { status: 'pending', attachments: [] };
            });
            directorsToNotify = allDirectors;
        } else {
            // 设置选中的厂长/总监
            directorsList.forEach(director => {
                const user = users.find(u => u.username === director);
                // 只有角色为director的用户才添加到directors审批对象中
                if (user && user.role === 'director') {
                    application.approvals.directors[director] = { status: 'pending', attachments: [] };
                    directorsToNotify.push(director);
                }
            });
        }

        // 发送邮件通知厂长
        const directorEmails = getUserEmails(directorsToNotify);
        if (directorEmails.length > 0) {
            const emailSubject = `新申请待审核 - ${application.applicant}`;
            const emailContent = generateEmailTemplate({
                title: '您有一份新的申请需要审批',
                applicant: application.applicant,
                applicationCode: application.applicationCode,
                department: application.department,
                date: application.date,
                content: application.content,
                priority: application.priority,
                status: getEmailStatusDescription(application.status, application),
                actionText: '立即审批',
                actionUrl: SERVER_CONFIG.url
            });
            sendEmailNotification(directorEmails, emailSubject, emailContent, application.applicationCode)
                .then(success => {
                    logWithTime('厂长邮件通知状态:', success ? '成功' : '失败');
                });
        }
    }

    // 如果是待总监审批状态，发送邮件通知总监
    if (application.status === '待总监审批') {
        // 获取所有选中的总监的邮箱
        const chiefEmails = getUserEmails(directorsList.filter(director => {
            const user = users.find(u => u.username === director);
            return user && user.role === 'chief';
        }));

        if (chiefEmails.length > 0) {
            const emailSubject = `新申请待审核 - ${application.applicant}`;
            const emailContent = generateEmailTemplate({
                title: '您有一份新的申请需要审批',
                applicant: application.applicant,
                applicationCode: application.applicationCode,
                department: application.department,
                date: application.date,
                content: application.content,
                priority: application.priority,
                status: getEmailStatusDescription(application.status, application),
                actionText: '立即审批',
                actionUrl: SERVER_CONFIG.url
            });
            sendEmailNotification(chiefEmails, emailSubject, emailContent, application.applicationCode)
                .then(success => {
                    logWithTime('总监邮件通知状态:', success ? '成功' : '失败');
                });
        }
    }

    applications.push(application);
    saveApplications(applications);

    res.json({ success: true, message: '申请提交成功', application: application });
});

// 修改申请接口
app.post('/modify', upload.array('attachments'), async (req, res) => {
    const { id, username, applicant, department, date, content, amount, currency, priority, selectedDirectors, role } = req.body;
    let applications = getApplications();
    const appIndex = applications.findIndex(a => a.id === parseInt(id));
    if (appIndex === -1) {
        return res.json({ success: false, message: '申请不存在' });
    }
    const app = applications[appIndex];

    // 检查权限：只有申请人自己或管理员可以修改
    // 只读角色不能修改申请
    const isAdmin = role === 'admin';
    const isReadOnly = role === 'readonly';
    const isApplicant = app.username === username;

    // 检查申请是否已经最终审核完成
    const isFinalStatus = app.status === '已通过' || app.status === '已拒绝';

    // 检查是否没有初始附件
    const hasNoInitialAttachments = !app.attachments || app.attachments.length === 0;

    // 检查是否在待总监审批状态且总监未审批
    const isWaitingChiefAndNotApproved = app.status === '待总监审批' &&
        app.approvals && app.approvals.chief && app.approvals.chief.status === 'pending';

    // 申请人可以修改的条件：
    // 1. 申请处于待厂长审核状态，或
    // 2. 申请处于待总监审批状态且总监未审批，或
    // 3. 申请流程进行中（未最终审核完成）且一开始没有添加初始附件
    const canApplicantModify = isApplicant &&
        (app.status === '待厂长审核' || isWaitingChiefAndNotApproved || (hasNoInitialAttachments && !isFinalStatus));

    if (isReadOnly || (!isAdmin && !canApplicantModify)) {
        return res.json({ success: false, message: '无权修改此申请或申请已进入审批流程' });
    }

    // 验证修改的数据
    const modificationData = {
        applicant: applicant,
        department: department,
        date: date,
        content: content,
        amount: amount,
        currency: currency || app.currency || 'CNY',
        priority: priority,
        username: username
    };

    const validationResult = validateApplicationData(modificationData);
    if (!validationResult.isValid) {
        console.log('申请修改数据验证失败:', validationResult.errors);
        return res.status(400).json({
            success: false,
            message: '数据验证失败：' + validationResult.errors.join('; ')
        });
    }

    // 更新基本信息
    app.applicant = applicant;
    app.department = department;
    app.date = date;
    app.content = content;
    app.amount = amount || app.amount;
    app.currency = currency || app.currency || 'CNY';
    app.priority = priority;

    // 确保提醒信息字段存在（兼容旧数据）
    if (!app.reminderInfo) {
        app.reminderInfo = {
            lastReminderTime: null,
            reminderCount: 0,
            escalationLevel: 'normal'
        };
    }

    // 如果是美元，获取汇率并计算人民币等值
    if (app.currency === 'USD' && app.amount) {
        try {
            const rate = await getUSDtoCNYRate();
            app.exchangeRate = rate;
            app.cnyEquivalent = parseFloat(app.amount) * rate;
            console.log(`美元金额: ${app.amount}, 汇率: ${rate}, 人民币等值: ${app.cnyEquivalent}`);
        } catch (error) {
            console.error('获取汇率失败:', error);
            // 使用默认汇率
            app.exchangeRate = 7.2;
            app.cnyEquivalent = parseFloat(app.amount) * 7.2;
        }
    }

    // 处理选中的厂长/总监
    if (selectedDirectors) {
        let directorsList = [];

        // 安全解析selectedDirectors，处理不同的数据格式
        try {
            if (Array.isArray(selectedDirectors)) {
                // 如果已经是数组，直接使用
                directorsList = selectedDirectors;
            } else if (typeof selectedDirectors === 'string') {
                // 如果是字符串，尝试解析为JSON
                if (selectedDirectors.startsWith('[') && selectedDirectors.endsWith(']')) {
                    // 看起来像JSON数组字符串
                    directorsList = JSON.parse(selectedDirectors);
                } else {
                    // 单个字符串值，转换为数组
                    directorsList = [selectedDirectors];
                }
            }
        } catch (parseError) {
            console.error('解析selectedDirectors失败:', parseError, '原始值:', selectedDirectors);
            // 如果解析失败，尝试将其作为单个值处理
            directorsList = typeof selectedDirectors === 'string' ? [selectedDirectors] : [];
        }

        // 获取用户数据以检查角色
        const users = getUsers();

        // 检查是否只选择了总监用户
        const selectedOnlyChiefs = directorsList.length > 0 &&
            directorsList.every(director => {
                const user = users.find(u => u.username === director);
                return user && user.role === 'chief';
            });

        // 如果只选择了总监，直接设置状态为"待总监审批"
        if (selectedOnlyChiefs) {
            app.status = '待总监审批';
            // 重置厂长审批状态，因为不需要厂长审批了
            app.approvals.directors = {};

            // 重置并记录总监审批阶段开始时间
            if (!app.stageTimestamps) {
                app.stageTimestamps = {};
            }
            app.stageTimestamps.chiefStageStartTime = new Date().toISOString();

            // 发送邮件通知总监
            const chiefEmails = getUserEmails(directorsList.filter(director => {
                const user = users.find(u => u.username === director);
                return user && user.role === 'chief';
            }));

            if (chiefEmails.length > 0) {
                const emailSubject = `修改后的申请待审核 - ${app.applicant}`;
                const emailContent = generateEmailTemplate({
                    title: '您有一份修改后的申请需要审批',
                    applicant: app.applicant,
                    applicationCode: app.applicationCode || '无编号',
                    department: app.department,
                    date: app.date,
                    content: app.content,
                    priority: app.priority,
                    status: getEmailStatusDescription(app.status, app),
                    actionText: '立即审批',
                    actionUrl: SERVER_CONFIG.url,
                    additionalInfo: '此申请已被申请人修改，请重新审核。'
                });
                sendEmailNotification(chiefEmails, emailSubject, emailContent, app.applicationCode)
                    .then(success => {
                        console.log('总监邮件通知状态:', success ? '成功' : '失败');
                    });
            }
        } else {
            // 重置厂长审批状态
            app.approvals.directors = {};

            // 设置申请状态为待厂长审核
            app.status = '待厂长审核';

            // 重置并记录厂长审批阶段开始时间
            if (!app.stageTimestamps) {
                app.stageTimestamps = {};
            }
            app.stageTimestamps.directorStageStartTime = new Date().toISOString();

            // 获取所有厂长用户名
            let directorsToNotify = [];

            // 如果没有选择厂长，默认所有厂长都需要审批
            if (directorsList.length === 0) {
                const allDirectors = users.filter(user => user.role === 'director').map(user => user.username);
                allDirectors.forEach(director => {
                    app.approvals.directors[director] = { status: 'pending', attachments: [] };
                });
                directorsToNotify = allDirectors;
            } else {
                // 只添加角色为director的用户到厂长审批列表
                directorsList.forEach(director => {
                    const user = users.find(u => u.username === director);
                    if (user && user.role === 'director') {
                        app.approvals.directors[director] = { status: 'pending', attachments: [] };
                        directorsToNotify.push(director);
                    }
                });
            }

            // 发送邮件通知厂长
            const directorEmails = getUserEmails(directorsToNotify);
            if (directorEmails.length > 0) {
                const emailSubject = `修改后的申请待审核 - ${app.applicant}`;
                const emailContent = generateEmailTemplate({
                    title: '您有一份修改后的申请需要审批',
                    applicant: app.applicant,
                    applicationCode: app.applicationCode || '无编号',
                    department: app.department,
                    date: app.date,
                    content: app.content,
                    priority: app.priority,
                    status: getEmailStatusDescription(app.status, app),
                    actionText: '立即审批',
                    actionUrl: SERVER_CONFIG.url,
                    additionalInfo: '此申请已被申请人修改，请重新审核。'
                });
                sendEmailNotification(directorEmails, emailSubject, emailContent, app.applicationCode)
                    .then(success => {
                        console.log('厂长邮件通知状态:', success ? '成功' : '失败');
                    });
            }
        }
    }

    // 处理新上传的附件
    if (req.files && req.files.length > 0) {
        const newAttachments = req.files.map(file => ({
            name: Buffer.from(file.originalname, 'latin1').toString('utf8'),
            path: file.filename
        }));
        app.attachments = newAttachments;
    }

    saveApplications(applications);
    res.json({ success: true, message: '申请修改成功', application: app });
});

// 获取单个申请详情
app.get('/application/:id', (req, res) => {
    const { id } = req.params;
    const { username } = req.query;

    if (!username) {
        return res.status(400).json({ success: false, message: '缺少用户名参数' });
    }

    try {
        // 读取用户信息获取角色
        const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        const user = users.find(u => u.username === username);
        if (!user) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }

        // 读取申请数据
        const applications = JSON.parse(fs.readFileSync(applicationsFile, 'utf8'));
        const app = applications.find(a => a.id === parseInt(id));

        if (!app) {
            return res.status(404).json({ success: false, message: '申请不存在' });
        }

        // 权限检查
        const isApplicant = app.username === username;
        const isAdmin = user.role === 'admin' || user.role === 'readonly';

        // 检查是否是审核人员且有权限查看此申请
        let isApprover = false;
        if (user.role === 'director') {
            // 厂长：可以查看待厂长审核的申请（如果指定了自己），或已审核过的申请
            const isPendingApprover = app.status === '待厂长审核' &&
                                    app.approvals && app.approvals.directors && app.approvals.directors[username];
            const hasApproved = app.approvals && app.approvals.directors && app.approvals.directors[username] &&
                              (app.approvals.directors[username].status === 'approved' ||
                               app.approvals.directors[username].status === 'rejected');
            isApprover = isPendingApprover || hasApproved;
        } else if (user.role === 'chief') {
            // 总监：可以查看待总监审核的申请，或已审核过的申请
            const isPendingApprover = app.status === '待总监审批' || app.status === '待总监审核';
            const hasApproved = app.approvals && app.approvals.chief &&
                              (app.approvals.chief.status === 'approved' ||
                               app.approvals.chief.status === 'rejected');
            isApprover = isPendingApprover || hasApproved;
        } else if (user.role === 'manager') {
            // 经理：可以查看待经理审核的申请（如果指定了自己），或已审核过的申请
            const isPendingApprover = (app.status === '待经理审批' || app.status === '待经理审核') &&
                                    app.approvals && app.approvals.managers && app.approvals.managers[username];
            const hasApproved = app.approvals && app.approvals.managers && app.approvals.managers[username] &&
                              (app.approvals.managers[username].status === 'approved' ||
                               app.approvals.managers[username].status === 'rejected');
            isApprover = isPendingApprover || hasApproved;
        } else if (user.role === 'ceo') {
            // CEO：可以查看待CEO审核的申请，或已审核过的申请
            const isPendingApprover = app.status === '待CEO审批' || app.status === '待CEO审核';
            const hasCeoApproved = app.approvals && app.approvals.ceo &&
                                 (app.approvals.ceo.status === 'approved' ||
                                  app.approvals.ceo.status === 'rejected');
            const hasManagerApproved = app.approvals && app.approvals.managers && app.approvals.managers[username] &&
                                     (app.approvals.managers[username].status === 'approved' ||
                                      app.approvals.managers[username].status === 'rejected');
            isApprover = isPendingApprover || hasCeoApproved || hasManagerApproved;
        }

        if (!isApplicant && !isAdmin && !isApprover) {
            return res.status(403).json({ success: false, message: '您无权查看此申请' });
        }

        res.json({ success: true, application: app });
    } catch (error) {
        console.error('获取申请详情失败:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// 获取申请列表（支持分页和搜索）
app.get('/applications', (req, res) => {
    const { username, page = 1, pageSize = 10, sortBy = 'date', sortOrder = 'desc', searchField, searchInput } = req.query;

    if (!username) {
        return res.status(400).json({ success: false, message: '缺少用户名参数' });
    }

    // 验证分页参数
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize) || 10)); // 限制每页最多100条
    const validSortFields = ['date', 'amount', 'status', 'priority'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'date';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    // 验证用户权限
    const users = getUsers();
    const user = users.find(u => u.username === username);
    if (!user) {
        return res.status(403).json({ success: false, message: '用户不存在' });
    }

    // 使用getAllApplications()获取所有数据（包括归档）
    const applications = getAllApplications({ includeAll: true });
    let filteredApplications = [];

    // 根据用户角色和权限筛选申请记录
    if (user.role === 'admin' || user.role === 'readonly') {
        // 管理员和只读用户可以看到所有申请
        filteredApplications = applications;
    } else {
        // 所有其他用户（包括审批人员）只能看到自己提交的申请
        filteredApplications = applications.filter(app =>
            app.username === username || app.applicant === username
        );
    }

    // 应用搜索过滤
    if (searchField && searchInput && searchInput.trim()) {
        const searchTerm = searchInput.toLowerCase().trim();
        filteredApplications = filteredApplications.filter(app => {
            if (searchField === 'applicant') {
                return app.applicant && app.applicant.toLowerCase().includes(searchTerm);
            } else if (searchField === 'content') {
                return app.content && app.content.toLowerCase().includes(searchTerm);
            }
            return true;
        });
    }

    // 排序处理
    filteredApplications.sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        // 特殊处理日期排序
        if (sortField === 'date') {
            aValue = new Date(aValue);
            bValue = new Date(bValue);
        }
        // 特殊处理金额排序
        else if (sortField === 'amount') {
            aValue = parseFloat(aValue) || 0;
            bValue = parseFloat(bValue) || 0;
        }
        // 特殊处理优先级排序
        else if (sortField === 'priority') {
            const priorityOrder = { '紧急': 1, '高': 2, '中': 3, '低': 4 };
            aValue = priorityOrder[aValue] || 5;
            bValue = priorityOrder[bValue] || 5;
        }

        if (aValue < bValue) return -1 * sortDirection;
        if (aValue > bValue) return 1 * sortDirection;
        return 0;
    });

    // 计算分页信息
    const totalItems = filteredApplications.length;
    const totalPages = Math.ceil(totalItems / pageSizeNum);
    const startIndex = (pageNum - 1) * pageSizeNum;
    const endIndex = Math.min(startIndex + pageSizeNum, totalItems);

    // 获取当前页数据
    const currentPageData = filteredApplications.slice(startIndex, endIndex);

    // 返回分页结果
    res.json({
        data: currentPageData,
        pagination: {
            currentPage: pageNum,
            pageSize: pageSizeNum,
            totalItems: totalItems,
            totalPages: totalPages,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1
        },
        sort: {
            sortBy: sortField,
            sortOrder: sortOrder
        }
    });
});

// 获取待审核申请（分页）
app.get('/applications/pending', (req, res) => {
    const { username, page = 1, pageSize = 10, sortBy = 'date', sortOrder = 'desc' } = req.query;

    if (!username) {
        return res.status(400).json({ success: false, message: '缺少用户名参数' });
    }

    try {
        // 参数验证和转换
        const pageNum = Math.max(1, parseInt(page));
        const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize)));
        const sortField = ['date', 'amount', 'status'].includes(sortBy) ? sortBy : 'date';

        // 读取用户信息获取角色
        const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        const user = users.find(u => u.username === username);
        if (!user) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }

        // 读取申请数据
        const applications = JSON.parse(fs.readFileSync(applicationsFile, 'utf8'));

        // 筛选待审核申请 - 根据用户角色和具体权限过滤
        const pendingApps = applications.filter(app => {
            // 检查申请状态是否需要当前用户角色的审核
            const needsApproval = needsApprovalByCurrentUser(app.status, user.role);
            if (!needsApproval) return false;

            // 根据用户角色进行具体权限检查
            if (user.role === 'admin' || user.role === 'readonly') {
                // 管理员和只读用户可以看到所有待审核申请
                return true;
            } else if (user.role === 'director') {
                // 厂长可以看到待厂长审核的申请
                if (app.status === '待厂长审核') {
                    // 如果申请中指定了具体的厂长审核人，检查是否包含当前用户
                    if (app.approvals && app.approvals.directors) {
                        return app.approvals.directors[username] !== undefined;
                    }
                    // 如果没有指定具体审核人，所有厂长都可以看到
                    return true;
                }
                return false;
            } else if (user.role === 'chief') {
                // 总监可以看到所有待总监审核的申请
                return app.status === '待总监审批' || app.status === '待总监审核';
            } else if (user.role === 'manager') {
                // 经理可以看到待经理审核的申请
                if (app.status === '待经理审批' || app.status === '待经理审核') {
                    // 如果申请中指定了具体的经理审核人，检查是否包含当前用户
                    if (app.approvals && app.approvals.managers) {
                        return app.approvals.managers[username] !== undefined;
                    }
                    // 如果没有指定具体审核人，所有经理都可以看到
                    return true;
                }
                return false;
            } else if (user.role === 'ceo') {
                // CEO可以看到所有待CEO审核的申请
                return app.status === '待CEO审批' || app.status === '待CEO审核';
            }

            return false;
        });

        // 排序
        pendingApps.sort((a, b) => {
            let aVal, bVal;
            if (sortField === 'date') {
                aVal = new Date(a.date);
                bVal = new Date(b.date);
            } else if (sortField === 'amount') {
                aVal = parseFloat(a.amount) || 0;
                bVal = parseFloat(b.amount) || 0;
            } else if (sortField === 'status') {
                aVal = a.status;
                bVal = b.status;
            }

            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        // 分页计算
        const totalItems = pendingApps.length;
        const totalPages = Math.ceil(totalItems / pageSizeNum);
        const startIndex = (pageNum - 1) * pageSizeNum;
        const endIndex = startIndex + pageSizeNum;
        const currentPageData = pendingApps.slice(startIndex, endIndex);

        const hasNextPage = pageNum < totalPages;
        const hasPrevPage = pageNum > 1;

        res.json({
            data: currentPageData,
            pagination: {
                currentPage: pageNum,
                pageSize: pageSizeNum,
                totalItems,
                totalPages,
                hasNextPage,
                hasPrevPage
            },
            sort: {
                sortBy: sortField,
                sortOrder
            }
        });
    } catch (error) {
        console.error('获取待审核申请失败:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// 获取已审核申请（分页和搜索）
app.get('/applications/approved', (req, res) => {
    const { username, page = 1, pageSize = 10, sortBy = 'date', sortOrder = 'desc', timeRange = 'all', statusFilter = 'all', searchField, searchInput } = req.query;

    if (!username) {
        return res.status(400).json({ success: false, message: '缺少用户名参数' });
    }

    try {
        // 参数验证和转换
        const pageNum = Math.max(1, parseInt(page));
        const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize)));
        const sortField = ['date', 'amount', 'status'].includes(sortBy) ? sortBy : 'date';

        // 读取用户信息获取角色
        const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        const user = users.find(u => u.username === username);
        if (!user) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }

        // 使用getAllApplications()获取所有数据（包括归档）
        const applications = getAllApplications({ includeAll: true });

        // 筛选已审核申请 - 根据用户角色权限过滤
        let approvedApps = applications.filter(app => {
            // 根据用户角色进行权限过滤，只要用户审核过就显示，不管申请整体状态
            if (user.role === 'admin' || user.role === 'readonly') {
                // 管理员和只读用户可以看到所有已完成的申请
                return app.status === '已通过' || app.status === '已拒绝';
            } else if (user.role === 'director') {
                // 厂长只能看到自己审核过的申请（不管申请整体状态）
                return app.approvals && app.approvals.directors && app.approvals.directors[username] &&
                       (app.approvals.directors[username].status === 'approved' || app.approvals.directors[username].status === 'rejected');
            } else if (user.role === 'chief') {
                // 总监只能看到自己审核过的申请（不管申请整体状态）
                return app.approvals && app.approvals.chief &&
                       (app.approvals.chief.status === 'approved' || app.approvals.chief.status === 'rejected');
            } else if (user.role === 'manager') {
                // 经理只能看到自己审核过的申请（不管申请整体状态）
                return app.approvals && app.approvals.managers && app.approvals.managers[username] &&
                       (app.approvals.managers[username].status === 'approved' || app.approvals.managers[username].status === 'rejected');
            } else if (user.role === 'ceo') {
                // CEO只能看到自己审核过的申请（不管申请整体状态）
                return (app.approvals && app.approvals.ceo &&
                        (app.approvals.ceo.status === 'approved' || app.approvals.ceo.status === 'rejected')) ||
                       (app.approvals && app.approvals.managers && app.approvals.managers[username] &&
                        (app.approvals.managers[username].status === 'approved' || app.approvals.managers[username].status === 'rejected'));
            }

            return false;
        });

        // 应用时间范围筛选
        if (timeRange !== 'all') {
            approvedApps = approvedApps.filter(app => {
                const appDate = new Date(app.date);
                const now = new Date();

                if (timeRange === 'week') {
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return appDate >= weekAgo;
                } else if (timeRange === 'month') {
                    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                    return appDate >= monthAgo;
                } else if (timeRange === 'year') {
                    const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                    return appDate >= yearAgo;
                }
                return true;
            });
        }

        // 应用状态筛选
        if (statusFilter !== 'all') {
            approvedApps = approvedApps.filter(app => {
                if (statusFilter === 'approved') {
                    return app.status.includes('通过');
                } else if (statusFilter === 'rejected') {
                    return app.status.includes('拒绝');
                }
                return true;
            });
        }

        // 应用搜索过滤
        if (searchField && searchInput && searchInput.trim()) {
            const searchTerm = searchInput.toLowerCase().trim();
            approvedApps = approvedApps.filter(app => {
                if (searchField === 'applicant') {
                    return app.applicant && app.applicant.toLowerCase().includes(searchTerm);
                } else if (searchField === 'content') {
                    return app.content && app.content.toLowerCase().includes(searchTerm);
                }
                return true;
            });
        }

        // 排序
        approvedApps.sort((a, b) => {
            let aVal, bVal;
            if (sortField === 'date') {
                aVal = new Date(a.date);
                bVal = new Date(b.date);
            } else if (sortField === 'amount') {
                aVal = parseFloat(a.amount) || 0;
                bVal = parseFloat(b.amount) || 0;
            } else if (sortField === 'status') {
                aVal = a.status;
                bVal = b.status;
            }

            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        // 分页计算
        const totalItems = approvedApps.length;
        const totalPages = Math.ceil(totalItems / pageSizeNum);
        const startIndex = (pageNum - 1) * pageSizeNum;
        const endIndex = startIndex + pageSizeNum;
        const currentPageData = approvedApps.slice(startIndex, endIndex);

        const hasNextPage = pageNum < totalPages;
        const hasPrevPage = pageNum > 1;

        // 计算统计数据（基于筛选后的全部数据）
        const stats = { total: { cny: 0, usd: 0 }, approved: { cny: 0, usd: 0 }, rejected: { cny: 0, usd: 0 }, count: { approved: 0, rejected: 0 } };
        approvedApps.forEach(app => {
            const amount = parseFloat(app.amount) || 0;
            const currency = app.currency || 'CNY';
            const isUsd = currency === 'USD';
            if (isUsd) { stats.total.usd += amount; } else { stats.total.cny += amount; }
            if (app.status === '已通过') {
                stats.count.approved++;
                if (isUsd) { stats.approved.usd += amount; } else { stats.approved.cny += amount; }
            } else if (app.status === '已拒绝') {
                stats.count.rejected++;
                if (isUsd) { stats.rejected.usd += amount; } else { stats.rejected.cny += amount; }
            }
        });

        res.json({
            data: currentPageData,
            pagination: {
                currentPage: pageNum,
                pageSize: pageSizeNum,
                totalItems,
                totalPages,
                hasNextPage,
                hasPrevPage
            },
            sort: {
                sortBy: sortField,
                sortOrder
            },
            stats
        });
    } catch (error) {
        console.error('获取已审核申请失败:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// 删除申请接口
app.post('/deleteApplication', (req, res) => {
    const { id, username, role } = req.body;
    let applications = getApplications();
    const appIndex = applications.findIndex(a => a.id === parseInt(id));

    if (appIndex === -1) {
        return res.json({ success: false, message: '申请不存在' });
    }

    const app = applications[appIndex];

    // 检查权限：只有申请人自己或管理员可以删除
    // 只读角色不能删除申请
    const isAdmin = role === 'admin';
    const isReadOnly = role === 'readonly';
    const isApplicant = app.username === username;

    // 检查是否在待总监审批状态且总监未审批
    const isWaitingChiefAndNotApproved = app.status === '待总监审批' &&
        app.approvals && app.approvals.chief && app.approvals.chief.status === 'pending';

    // 申请人可以删除的条件：
    // 1. 申请处于待厂长审核状态，或
    // 2. 申请处于待总监审批状态且总监未审批
    // 管理员可以删除任何状态的申请
    const canApplicantDelete = isApplicant && (app.status === '待厂长审核' || isWaitingChiefAndNotApproved);

    if (isReadOnly || (!isAdmin && !canApplicantDelete)) {
        return res.json({ success: false, message: '无权删除此申请或申请已进入审批流程' });
    }

    // 删除附件
    if (app.attachments && app.attachments.length > 0) {
        app.attachments.forEach(attachment => {
            const filePath = path.join(__dirname, '..', 'uploads', attachment.path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });
    }

    // 从数组中删除申请
    applications.splice(appIndex, 1);
    saveApplications(applications);

    res.json({ success: true, message: '申请删除成功' });
});

// 审批申请接口（含归档逻辑）
app.post('/approve', upload.array('newAttachments'), async (req, res) => {
    const { id, role, status, username, selectedManagers, comment, signature } = req.body;
    let applications = getApplications();
    const appIndex = applications.findIndex(a => a.id === parseInt(id));
    if (appIndex === -1) {
        return res.json({ success: false, message: '申请不存在' });
    }
    const app = applications[appIndex];

    // 处理附件
    const newAttachments = req.files && req.files.length > 0 ?
        req.files.map(file => ({
            name: Buffer.from(file.originalname, 'latin1').toString('utf8'),
            path: file.filename
        })) : [];

    console.log(`收到审批请求: ID=${id}, 角色=${role}, 状态=${status}, 用户=${username}`);
    console.log(`新上传附件数量: ${newAttachments.length}`);

    // 管理员和只读角色不能进行任何审批操作
    if (role === 'admin' || role === 'readonly') {
        return res.status(403).json({ success: false, message: '您无权进行审批操作' });
    }

    // 根据角色处理不同的审批逻辑
    if (role === 'director') {
        // 厂长审批
        if (!app.approvals.directors[username] || app.approvals.directors[username].status !== 'pending') {
            return res.json({ success: false, message: '您不是该申请的审批人或已完成审批' });
        }

        // 确保附件数组存在
        if (!app.approvals.directors[username].attachments) {
            app.approvals.directors[username].attachments = [];
        }

        // 更新当前厂长的审批状态和附件
        app.approvals.directors[username].status = status;
        if (newAttachments.length > 0) {
            app.approvals.directors[username].attachments = newAttachments;
        }
        app.approvals.directors[username].comment = comment || '';
        app.approvals.directors[username].date = new Date().toISOString();
        app.approvals.directors[username].signature = signature || '';

        console.log(`厂长 ${username} 审批完成，状态: ${status}, 附件数: ${app.approvals.directors[username].attachments.length}`);

        if (status === 'approved') {
            // 检查是否所有厂长都已审批通过
            const directorsEntries = Object.entries(app.approvals.directors);

            console.log(`申请ID=${id} 审批状态检查: 共有${directorsEntries.length}个厂长需要审批`);

            // 输出每个厂长的审批状态
            directorsEntries.forEach(([dirName, dirStatus]) => {
                console.log(`- 厂长 ${dirName} 的审批状态: ${dirStatus.status}`);
            });

            const allDirectorsApproved = directorsEntries.length > 0 &&
                directorsEntries.every(([_, d]) => d.status === 'approved');

            console.log(`申请ID=${id} 是否所有厂长都已审批通过: ${allDirectorsApproved}`);

            if (allDirectorsApproved) {
                // 所有厂长都通过，流转到总监
                console.log(`申请ID=${id} 从"${app.status}"状态更改为"待总监审批"`);
                app.status = '待总监审批';

                // 重置提醒信息，因为进入了新的审批阶段
                if (app.reminderInfo) {
                    app.reminderInfo.lastReminderTime = null;
                    app.reminderInfo.reminderCount = 0;
                    app.reminderInfo.escalationLevel = 'normal';
                }

                // 记录当前审批层级的开始时间
                if (!app.stageTimestamps) {
                    app.stageTimestamps = {};
                }
                app.stageTimestamps.chiefStageStartTime = new Date().toISOString();

                // 发送邮件通知总监
                const users = getUsers();
                const chiefs = users.filter(user => user.role === 'chief').map(user => user.username);
                const chiefEmails = getUserEmails(chiefs);

                console.log(`发现${chiefs.length}个总监，邮箱地址数量: ${chiefEmails.length}`);

                if (chiefEmails.length > 0) {
                    const emailSubject = `新申请待审核 - ${app.applicant}`;
                    const emailContent = generateEmailTemplate({
                        title: '您有一份申请需要审批',
                        applicant: app.applicant,
                        applicationCode: app.applicationCode || '无编号',
                        department: app.department,
                        date: app.date,
                        content: app.content,
                        priority: app.priority,
                        status: getEmailStatusDescription(app.status, app),
                        actionText: '立即审批',
                        actionUrl: SERVER_CONFIG.url,
                        additionalInfo: '此申请已通过厂长审核，现需要您的审批。'
                    });
                    sendEmailNotification(chiefEmails, emailSubject, emailContent, app.applicationCode)
                        .then(success => {
                            console.log('总监邮件通知状态:', success ? '成功' : '失败');
                        });
                }
            } else {
                console.log(`申请ID=${id} 尚有厂长未通过审批，保持当前状态: ${app.status}`);
            }
        } else if (status === 'rejected') {
            // 任一厂长拒绝，整个申请被拒绝
            app.status = '已拒绝';

            // 发送邮件通知申请人
            const users = getUsers();
            // 优先使用申请人的用户名查找，如果找不到则尝试使用申请人姓名查找
            let applicantUser = users.find(user => user.username === app.username);
            if (!applicantUser) {
                applicantUser = users.find(user => user.username === app.applicant);
            }

            if (applicantUser && applicantUser.email) {
                const emailSubject = `您的申请已被驳回 - ${app.applicationCode || ''}`;
                const emailContent = generateEmailTemplate({
                    title: '您的申请已被驳回',
                    applicant: app.applicant,
                    applicationCode: app.applicationCode || '无编号',
                    department: app.department,
                    date: app.date,
                    content: app.content,
                    priority: app.priority,
                    status: '已驳回',
                    actionText: '查看详情',
                    actionUrl: SERVER_CONFIG.url,
                    additionalInfo: `<strong>驳回原因:</strong> ${comment || '无'}<br><strong>驳回人:</strong> 厂长 ${username}`
                });
                sendEmailNotification(applicantUser.email, emailSubject, emailContent, app.applicationCode)
                    .then(success => {
                        console.log('申请人驳回通知邮件状态:', success ? '成功' : '失败');
                    });
            } else {
                console.log(`无法发送邮件通知申请人：找不到申请人 ${app.username} 的邮箱信息`);
            }
        }
    } else if (role === 'chief') {
        // 总监审批
        // 确保附件数组存在
        if (!app.approvals.chief.attachments) {
            app.approvals.chief.attachments = [];
        }

        app.approvals.chief.status = status;
        if (newAttachments.length > 0) {
            app.approvals.chief.attachments = newAttachments;
        }
        app.approvals.chief.comment = comment || '';
        app.approvals.chief.date = new Date().toISOString();
        app.approvals.chief.signature = signature || '';

        console.log(`总监审批完成，状态: ${status}, 附件数: ${app.approvals.chief.attachments.length}`);

        if (status === 'approved') {
            // 处理选中的经理
            let managersToNotify = [];

            if (selectedManagers && selectedManagers.length > 0) {
                let managersList = [];

                // 安全解析selectedManagers，处理不同的数据格式
                try {
                    if (Array.isArray(selectedManagers)) {
                        // 如果已经是数组，直接使用
                        managersList = selectedManagers;
                    } else if (typeof selectedManagers === 'string') {
                        // 如果是字符串，尝试解析为JSON
                        if (selectedManagers.startsWith('[') && selectedManagers.endsWith(']')) {
                            // 看起来像JSON数组字符串
                            managersList = JSON.parse(selectedManagers);
                        } else {
                            // 单个字符串值，转换为数组
                            managersList = [selectedManagers];
                        }
                    }
                } catch (parseError) {
                    console.error('解析selectedManagers失败:', parseError, '原始值:', selectedManagers);
                    // 如果解析失败，尝试将其作为单个值处理
                    managersList = typeof selectedManagers === 'string' ? [selectedManagers] : [];
                }
                if (managersList.length > 0) {
                    managersList.forEach(manager => {
                        app.approvals.managers[manager] = { status: 'pending', attachments: [] };
                    });
                    managersToNotify = managersList;
                    app.status = '待经理审批';
                } else {
                    // 如果解析后的数组为空，流转到CEO审批
                    app.status = '待CEO审批';

                    // 初始化CEO审批结构
                    if (!app.approvals.ceo) {
                        app.approvals.ceo = { status: 'pending', attachments: [] };
                    }
                }

                // 重置提醒信息，因为进入了新的审批阶段
                if (app.reminderInfo) {
                    app.reminderInfo.lastReminderTime = null;
                    app.reminderInfo.reminderCount = 0;
                    app.reminderInfo.escalationLevel = 'normal';
                }

                // 记录当前审批层级的开始时间
                if (!app.stageTimestamps) {
                    app.stageTimestamps = {};
                }
                if (app.status === '待经理审批') {
                    app.stageTimestamps.managerStageStartTime = new Date().toISOString();
                } else if (app.status === '待CEO审批') {
                    app.stageTimestamps.ceoStageStartTime = new Date().toISOString();
                }

                // 发送邮件通知经理或CEO
                if (managersToNotify.length > 0) {
                    // 发送邮件通知经理
                    const managerEmails = getUserEmails(managersToNotify);
                    if (managerEmails.length > 0) {
                        const emailSubject = `新申请待审核 - ${app.applicant}`;
                        const emailContent = generateEmailTemplate({
                            title: '您有一份申请需要审批',
                            applicant: app.applicant,
                            applicationCode: app.applicationCode || '无编号',
                            department: app.department,
                            date: app.date,
                            content: app.content,
                            priority: app.priority,
                            status: getEmailStatusDescription(app.status, app),
                            actionText: '立即审批',
                            actionUrl: SERVER_CONFIG.url,
                            additionalInfo: '此申请已通过厂长和总监审核，现需要您的审批。'
                        });
                        sendEmailNotification(managerEmails, emailSubject, emailContent, app.applicationCode)
                            .then(success => {
                                console.log('经理邮件通知状态:', success ? '成功' : '失败');
                            });
                    }
                } else if (app.status === '待CEO审批') {
                    // 发送邮件通知CEO
                    const users = getUsers();
                    const ceoUsers = users.filter(user => user.role === 'ceo');
                    const ceoEmails = ceoUsers.map(user => user.email).filter(email => email);

                    if (ceoEmails.length > 0) {
                        const emailSubject = `新申请待审核 - ${app.applicant}`;
                        const emailContent = generateEmailTemplate({
                            title: '您有一份申请需要审批',
                            applicant: app.applicant,
                            applicationCode: app.applicationCode || '无编号',
                            department: app.department,
                            date: app.date,
                            content: app.content,
                            priority: app.priority,
                            status: getEmailStatusDescription(app.status, app),
                            actionText: '立即审批',
                            actionUrl: SERVER_CONFIG.url,
                            additionalInfo: '此申请已通过厂长和总监审核，现需要您的最终审批。'
                        });
                        sendEmailNotification(ceoEmails, emailSubject, emailContent, app.applicationCode)
                            .then(success => {
                                console.log('CEO邮件通知状态:', success ? '成功' : '失败');
                            });
                    }

                    console.log('总监审批通过，未选择经理，申请流转到CEO审批');
                }
            } else {
                // 如果没有选择经理，申请流转到CEO审批
                app.status = '待CEO审批';

                // 初始化CEO审批结构
                if (!app.approvals.ceo) {
                    app.approvals.ceo = { status: 'pending', attachments: [] };
                }

                // 重置提醒信息，因为进入了新的审批阶段
                if (app.reminderInfo) {
                    app.reminderInfo.lastReminderTime = null;
                    app.reminderInfo.reminderCount = 0;
                    app.reminderInfo.escalationLevel = 'normal';
                }

                // 记录当前审批层级的开始时间
                if (!app.stageTimestamps) {
                    app.stageTimestamps = {};
                }
                app.stageTimestamps.ceoStageStartTime = new Date().toISOString();

                // 发送邮件通知CEO
                const users = getUsers();
                const ceoUsers = users.filter(user => user.role === 'ceo');
                const ceoEmails = ceoUsers.map(user => user.email).filter(email => email);

                if (ceoEmails.length > 0) {
                    const emailSubject = `新申请待审核 - ${app.applicant}`;
                    const emailContent = generateEmailTemplate({
                        title: '您有一份申请需要审批',
                        applicant: app.applicant,
                        applicationCode: app.applicationCode || '无编号',
                        department: app.department,
                        date: app.date,
                        content: app.content,
                        priority: app.priority,
                        status: getEmailStatusDescription(app.status, app),
                        actionText: '立即审批',
                        actionUrl: SERVER_CONFIG.url,
                        additionalInfo: '此申请已通过厂长和总监审核，现需要您的最终审批。'
                    });
                    sendEmailNotification(ceoEmails, emailSubject, emailContent, app.applicationCode)
                        .then(success => {
                            console.log('CEO邮件通知状态:', success ? '成功' : '失败');
                        });
                }

                console.log('总监审批通过，未选择经理，申请流转到CEO审批');
            }
        } else if (status === 'rejected') {
            app.status = '已拒绝';

            // 发送邮件通知申请人
            const users = getUsers();
            // 优先使用申请人的用户名查找，如果找不到则尝试使用申请人姓名查找
            let applicantUser = users.find(user => user.username === app.username);
            if (!applicantUser) {
                applicantUser = users.find(user => user.username === app.applicant);
            }

            if (applicantUser && applicantUser.email) {
                const emailSubject = `您的申请已被驳回 - ${app.applicationCode || ''}`;
                const emailContent = generateEmailTemplate({
                    title: '您的申请已被驳回',
                    applicant: app.applicant,
                    applicationCode: app.applicationCode || '无编号',
                    department: app.department,
                    date: app.date,
                    content: app.content,
                    priority: app.priority,
                    status: '已驳回',
                    actionText: '查看详情',
                    actionUrl: SERVER_CONFIG.url,
                    additionalInfo: `<strong>驳回原因:</strong> ${comment || '无'}<br><strong>驳回人:</strong> 总监`
                });
                sendEmailNotification(applicantUser.email, emailSubject, emailContent, app.applicationCode)
                    .then(success => {
                        console.log('申请人驳回通知邮件状态:', success ? '成功' : '失败');
                    });
            } else {
                console.log(`无法发送邮件通知申请人：找不到申请人 ${app.username} 的邮箱信息`);
            }
        }
    } else if (role === 'manager') {
        // 经理审批
        if (!app.approvals.managers[username] || app.approvals.managers[username].status !== 'pending') {
            return res.json({ success: false, message: '您不是该申请的审批人或已完成审批' });
        }

        // 确保附件数组存在
        if (!app.approvals.managers[username].attachments) {
            app.approvals.managers[username].attachments = [];
        }

        // 更新当前经理的审批状态和附件
        app.approvals.managers[username].status = status;
        if (newAttachments.length > 0) {
            app.approvals.managers[username].attachments = newAttachments;
        }
        app.approvals.managers[username].comment = comment || '';
        app.approvals.managers[username].date = new Date().toISOString();
        app.approvals.managers[username].signature = signature || '';

        console.log(`经理 ${username} 审批完成，状态: ${status}, 附件数: ${app.approvals.managers[username].attachments.length}`);

        if (status === 'approved') {
            // 检查是否所有经理都已审批通过
            const allManagersApproved = Object.values(app.approvals.managers)
                .every(m => m.status === 'approved');

            if (allManagersApproved) {
                // 获取用户数据以检查经理的用户代码
                const users = getUsers();

                // 检查参与审批的经理中是否有用户代码为"E10002"的经理
                const managerUsernames = Object.keys(app.approvals.managers);
                const hasE10002Manager = managerUsernames.some(managerUsername => {
                    const managerUser = users.find(u => u.username === managerUsername);
                    return managerUser && managerUser.userCode === 'E10002';
                });

                console.log(`经理审批完成检查: 参与审批的经理: ${managerUsernames.join(', ')}`);
                console.log(`是否包含用户代码E10002的经理: ${hasE10002Manager}`);

                if (hasE10002Manager) {
                    // 如果有用户代码为E10002的经理参与审批，直接完成申请
                    app.status = '已通过';

                    // 归档所有附件
                    archiveAttachments(app);

                    console.log('检测到用户代码E10002的经理参与审批，申请直接通过，跳过CEO审批');

                    // 发送邮件通知申请人申请已通过
                    // 优先使用申请人的用户名查找，如果找不到则尝试使用申请人姓名查找
                    let applicantUser = users.find(user => user.username === app.username);
                    if (!applicantUser) {
                        applicantUser = users.find(user => user.username === app.applicant);
                    }

                    // 准备申请人的邮件内容
                    const applicantEmailSubject = `您的申请已通过 - ${app.applicationCode || ''}`;
                    const applicantEmailContent = generateEmailTemplate({
                        title: '恭喜！您的申请已通过',
                        applicant: app.applicant,
                        applicationCode: app.applicationCode || '无编号',
                        department: app.department,
                        date: app.date,
                        content: app.content,
                        priority: app.priority,
                        status: '已通过',
                        actionText: '查看详情',
                        actionUrl: SERVER_CONFIG.url,
                        additionalInfo: '您的申请已完成全部审批流程并获得通过。'
                    });

                    // 发送邮件给申请人
                    if (applicantUser && applicantUser.email) {
                        sendEmailNotification(applicantUser.email, applicantEmailSubject, applicantEmailContent, app.applicationCode)
                            .then(success => {
                                console.log('申请人通过通知邮件状态:', success ? '成功' : '失败');
                            });
                    } else {
                        console.log(`无法发送邮件通知申请人：找不到申请人 ${app.username} 的邮箱信息`);
                    }

                    // 准备只读用户的邮件内容
                    const readonlyEmailSubject = `新的已审批通过申请提醒 - ${app.applicationCode || ''}`;
                    const readonlyEmailContent = generateEmailTemplate({
                        title: '有新的申请已完成审批流程',
                        applicant: app.applicant,
                        applicationCode: app.applicationCode || '无编号',
                        department: app.department,
                        date: app.date,
                        content: app.content,
                        priority: app.priority,
                        status: '已通过',
                        actionText: '查看详情',
                        actionUrl: SERVER_CONFIG.url,
                        additionalInfo: '该申请已完成全部审批流程并获得通过。'
                    });

                    // 检查申请金额是否超过100000人民币，只有超过才发送邮件给只读用户
                    let cnyAmount = 0;

                    // 如果是美元，使用提交时记录的汇率和人民币等值
                    if (app.currency === 'USD') {
                        // 确保使用提交时记录的汇率进行换算
                        if (app.exchangeRate && app.amount) {
                            cnyAmount = parseFloat(app.amount) * app.exchangeRate;
                            console.log(`美元申请: ${app.amount} USD, 提交时汇率: ${app.exchangeRate}, 人民币等值: ${cnyAmount} CNY`);
                        } else {
                            // 如果没有记录汇率，使用已换算金额或默认汇率
                            cnyAmount = app.cnyEquivalent || (parseFloat(app.amount || 0) * 7.2);
                            console.log(`美元申请: ${app.amount} USD, 使用默认汇率计算人民币等值: ${cnyAmount} CNY`);
                        }
                    } else {
                        // 如果是人民币，直接使用金额
                        cnyAmount = parseFloat(app.amount || 0);
                    }

                    if (cnyAmount > 100000) {
                        console.log(`申请金额 ${app.currency === 'USD' ? app.amount + ' USD (' + cnyAmount + ' CNY)' : cnyAmount + ' CNY'} 超过100000人民币，发送邮件给只读用户`);
                        // 发送邮件给所有只读用户
                        const readonlyUsers = users.filter(user => user.role === 'readonly' && user.email);
                        if (readonlyUsers.length > 0) {
                            const readonlyEmails = readonlyUsers.map(user => user.email);
                            sendEmailNotification(readonlyEmails, readonlyEmailSubject, readonlyEmailContent, app.applicationCode)
                                .then(success => {
                                    console.log('只读用户通知邮件状态:', success ? '成功' : '失败');
                                });
                        }
                    } else {
                        console.log(`申请金额 ${app.currency === 'USD' ? app.amount + ' USD (' + cnyAmount + ' CNY)' : cnyAmount + ' CNY'} 不超过100000人民币，不发送邮件给只读用户`);
                    }
                } else {
                    // 没有用户代码为E10002的经理，按原有流程流转到CEO审批
                    app.status = '待CEO审批';

                    // 初始化CEO审批结构
                    if (!app.approvals.ceo) {
                        app.approvals.ceo = { status: 'pending', attachments: [] };
                    }

                    // 重置提醒信息，因为进入了新的审批阶段
                    if (app.reminderInfo) {
                        app.reminderInfo.lastReminderTime = null;
                        app.reminderInfo.reminderCount = 0;
                        app.reminderInfo.escalationLevel = 'normal';
                    }

                    // 记录当前审批层级的开始时间
                    if (!app.stageTimestamps) {
                        app.stageTimestamps = {};
                    }
                    app.stageTimestamps.ceoStageStartTime = new Date().toISOString();

                    // 发送邮件通知CEO
                    const users = getUsers();
                    const ceoUsers = users.filter(user => user.role === 'ceo');
                    const ceoEmails = ceoUsers.map(user => user.email).filter(email => email);

                    if (ceoEmails.length > 0) {
                        const emailSubject = `新申请待审核 - ${app.applicant}`;
                        const emailContent = generateEmailTemplate({
                            title: '您有一份申请需要审批',
                            applicant: app.applicant,
                            applicationCode: app.applicationCode || '无编号',
                            department: app.department,
                            date: app.date,
                            content: app.content,
                            priority: app.priority,
                            status: getEmailStatusDescription(app.status, app),
                            actionText: '立即审批',
                            actionUrl: SERVER_CONFIG.url,
                            additionalInfo: '此申请已通过所有前置审核，现需要您的最终审批。'
                        });
                        sendEmailNotification(ceoEmails, emailSubject, emailContent, app.applicationCode)
                            .then(success => {
                                console.log('CEO邮件通知状态:', success ? '成功' : '失败');
                            });
                    }

                    console.log('经理审批通过，申请流转到CEO审批');
                }
            } else {
                console.log('还有经理未完成审批，等待其他经理审批');
            }
        } else if (status === 'rejected') {
            // 任一经理拒绝，整个申请被拒绝
            app.status = '已拒绝';

            // 发送邮件通知申请人
            const users = getUsers();
            // 优先使用申请人的用户名查找，如果找不到则尝试使用申请人姓名查找
            let applicantUser = users.find(user => user.username === app.username);
            if (!applicantUser) {
                applicantUser = users.find(user => user.username === app.applicant);
            }

            if (applicantUser && applicantUser.email) {
                const emailSubject = `您的申请已被驳回 - ${app.applicationCode || ''}`;
                const emailContent = generateEmailTemplate({
                    title: '您的申请已被驳回',
                    applicant: app.applicant,
                    applicationCode: app.applicationCode || '无编号',
                    department: app.department,
                    date: app.date,
                    content: app.content,
                    priority: app.priority,
                    status: '已驳回',
                    actionText: '查看详情',
                    actionUrl: SERVER_CONFIG.url,
                    additionalInfo: `<strong>驳回原因:</strong> ${comment || '无'}<br><strong>驳回人:</strong> 经理 ${username}`
                });
                sendEmailNotification(applicantUser.email, emailSubject, emailContent, app.applicationCode)
                    .then(success => {
                        console.log('申请人驳回通知邮件状态:', success ? '成功' : '失败');
                    });
            } else {
                console.log(`无法发送邮件通知申请人：找不到申请人 ${app.username} 的邮箱信息`);
            }
        }
    } else if (role === 'ceo') {
        // CEO审批
        if (!app.approvals.ceo || app.approvals.ceo.status !== 'pending') {
            return res.json({ success: false, message: '您不是该申请的审批人或已完成审批' });
        }

        // 确保附件数组存在
        if (!app.approvals.ceo.attachments) {
            app.approvals.ceo.attachments = [];
        }

        // 更新CEO的审批状态和附件
        app.approvals.ceo.status = status;
        if (newAttachments.length > 0) {
            app.approvals.ceo.attachments = newAttachments;
        }
        app.approvals.ceo.comment = comment || '';
        app.approvals.ceo.date = new Date().toISOString();
        app.approvals.ceo.signature = signature || '';
        app.approvals.ceo.approverUsername = username; // 记录审批人用户名，便于历史数据处理

        console.log(`CEO审批完成，状态: ${status}, 附件数: ${app.approvals.ceo.attachments.length}`);
        console.log(`CEO签名信息: ${signature ? '有签名 (长度: ' + signature.length + ')' : '无签名'}`);
        console.log(`CEO审批人用户名: ${username}`);

        if (status === 'approved') {
            // CEO审批通过，申请最终通过
            app.status = '已通过';
            // 归档所有附件
            archiveAttachments(app);

            // 发送邮件通知申请人申请已通过
            const users = getUsers();
            // 优先使用申请人的用户名查找，如果找不到则尝试使用申请人姓名查找
            let applicantUser = users.find(user => user.username === app.username);
            if (!applicantUser) {
                applicantUser = users.find(user => user.username === app.applicant);
            }

            // 准备申请人的邮件内容
            const applicantEmailSubject = `您的申请已通过 - ${app.applicationCode || ''}`;
            const applicantEmailContent = generateEmailTemplate({
                title: '恭喜！您的申请已通过',
                applicant: app.applicant,
                applicationCode: app.applicationCode || '无编号',
                department: app.department,
                date: app.date,
                content: app.content,
                priority: app.priority,
                status: '已通过',
                actionText: '查看详情',
                actionUrl: SERVER_CONFIG.url,
                additionalInfo: '您的申请已完成全部审批流程并获得通过。'
            });

            // 发送邮件给申请人
            if (applicantUser && applicantUser.email) {
                sendEmailNotification(applicantUser.email, applicantEmailSubject, applicantEmailContent, app.applicationCode)
                    .then(success => {
                        console.log('申请人通过通知邮件状态:', success ? '成功' : '失败');
                    });
            } else {
                console.log(`无法发送邮件通知申请人：找不到申请人 ${app.username} 的邮箱信息`);
            }

            // 准备只读用户的邮件内容
            const readonlyEmailSubject = `新的已审批通过申请提醒 - ${app.applicationCode || ''}`;
            const readonlyEmailContent = generateEmailTemplate({
                title: '有新的申请已完成审批流程',
                applicant: app.applicant,
                applicationCode: app.applicationCode || '无编号',
                department: app.department,
                date: app.date,
                content: app.content,
                priority: app.priority,
                status: '已通过',
                actionText: '查看详情',
                actionUrl: SERVER_CONFIG.url,
                additionalInfo: '该申请已完成全部审批流程并获得通过。'
            });

            // 检查申请金额是否超过100000人民币，只有超过才发送邮件给只读用户
            let cnyAmount = 0;

            // 如果是美元，使用提交时记录的汇率和人民币等值
            if (app.currency === 'USD') {
                // 确保使用提交时记录的汇率进行换算
                if (app.exchangeRate && app.amount) {
                    cnyAmount = parseFloat(app.amount) * app.exchangeRate;
                    console.log(`美元申请: ${app.amount} USD, 提交时汇率: ${app.exchangeRate}, 人民币等值: ${cnyAmount} CNY`);
                } else {
                    // 如果没有记录汇率，使用已换算金额或默认汇率
                    cnyAmount = app.cnyEquivalent || (parseFloat(app.amount || 0) * 7.2);
                    console.log(`美元申请: ${app.amount} USD, 使用默认汇率计算人民币等值: ${cnyAmount} CNY`);
                }
            } else {
                // 如果是人民币，直接使用金额
                cnyAmount = parseFloat(app.amount || 0);
            }

            if (cnyAmount > 100000) {
                console.log(`申请金额 ${app.currency === 'USD' ? app.amount + ' USD (' + cnyAmount + ' CNY)' : cnyAmount + ' CNY'} 超过100000人民币，发送邮件给只读用户`);
                // 发送邮件给所有只读用户
                const readonlyUsers = users.filter(user => user.role === 'readonly' && user.email);
                if (readonlyUsers.length > 0) {
                    const readonlyEmails = readonlyUsers.map(user => user.email);
                    sendEmailNotification(readonlyEmails, readonlyEmailSubject, readonlyEmailContent, app.applicationCode)
                        .then(success => {
                            console.log('只读用户通知邮件状态:', success ? '成功' : '失败');
                        });
                }
            } else {
                console.log(`申请金额 ${app.currency === 'USD' ? app.amount + ' USD (' + cnyAmount + ' CNY)' : cnyAmount + ' CNY'} 不超过100000人民币，不发送邮件给只读用户`);
            }
        } else if (status === 'rejected') {
            // CEO拒绝，整个申请被拒绝
            app.status = '已拒绝';

            // 发送邮件通知申请人
            const users = getUsers();
            // 优先使用申请人的用户名查找，如果找不到则尝试使用申请人姓名查找
            let applicantUser = users.find(user => user.username === app.username);
            if (!applicantUser) {
                applicantUser = users.find(user => user.username === app.applicant);
            }

            if (applicantUser && applicantUser.email) {
                const emailSubject = `您的申请已被驳回 - ${app.applicationCode || ''}`;
                const emailContent = generateEmailTemplate({
                    title: '您的申请已被驳回',
                    applicant: app.applicant,
                    applicationCode: app.applicationCode || '无编号',
                    department: app.department,
                    date: app.date,
                    content: app.content,
                    priority: app.priority,
                    status: '已驳回',
                    actionText: '查看详情',
                    actionUrl: SERVER_CONFIG.url,
                    additionalInfo: `<strong>驳回原因:</strong> ${comment || '无'}<br><strong>驳回人:</strong> CEO`
                });
                sendEmailNotification(applicantUser.email, emailSubject, emailContent, app.applicationCode)
                    .then(success => {
                        console.log('申请人驳回通知邮件状态:', success ? '成功' : '失败');
                    });
            } else {
                console.log(`无法发送邮件通知申请人：找不到申请人 ${app.username} 的邮箱信息`);
            }
        }
    } else {
        return res.json({ success: false, message: '无效的审批角色或申请状态' });
    }

    // 添加调试日志
    console.log(`准备保存申请ID=${id}的审批数据，当前状态=${app.status}`);

    // 厂长审批时特别记录所有厂长的审批状态
    if (role === 'director') {
        const directorsStatus = Object.entries(app.approvals.directors).map(([name, d]) =>
            `${name}: ${d.status}`).join(', ');
        console.log(`厂长审批状态: ${directorsStatus}`);
    }

    // 保存应用数据并检查结果
    const saveResult = saveApplications(applications);
    if (!saveResult) {
        console.error(`保存申请审批数据失败: ID=${id}`);
        return res.status(500).json({ success: false, message: '保存数据失败，请稍后重试' });
    }

    console.log(`申请审批数据已保存成功: ID=${id}, 状态=${app.status}`);
    res.json({ success: true, message: '审批完成', application: app });
});

// 文件下载接口
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const originalName = req.query.name; // 获取原始文件名
    const filePath = path.join(__dirname, '..', 'uploads', filename);

    if (fs.existsSync(filePath)) {
        if (originalName) {
            // 如果提供了原始文件名，使用它作为下载文件名
            const decodedName = decodeURIComponent(originalName);
            res.download(filePath, decodedName);
        } else {
            // 如果没有提供原始文件名，尝试从存储的文件名中提取
            // 存储格式：timestamp-randomNumber-originalName
            const parts = filename.split('-');
            if (parts.length >= 3) {
                // 移除前两部分（时间戳和随机数），保留原始文件名
                const extractedName = parts.slice(2).join('-');
                res.download(filePath, extractedName);
            } else {
                // 如果无法提取，使用存储的文件名
                res.download(filePath);
            }
        }
    } else {
        res.status(404).json({ success: false, message: '文件不存在' });
    }
});

// 文件预览接口
app.get('/preview/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '..', 'uploads', filename);

    if (fs.existsSync(filePath)) {
        // 获取文件扩展名
        const ext = path.extname(filename).toLowerCase();

        // 根据文件类型设置适当的Content-Type（现在只支持PDF）
        if (ext === '.pdf') {
            res.setHeader('Content-Type', 'application/pdf');
        } else {
            // 默认二进制流（理论上不应该有非PDF文件）
            res.setHeader('Content-Type', 'application/octet-stream');
        }

        // 设置内联显示而非下载
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);

        // 发送文件
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.status(404).json({ success: false, message: '文件不存在' });
    }
});

// 处理角色变更时的历史审批记录保留
function handleRoleChangeApprovalHistory(username, originalRole, newRole) {
    try {
        console.log(`开始处理用户 ${username} 的角色变更：${originalRole} -> ${newRole}`);

        // 获取所有申请数据
        let applications = getApplications();
        let hasChanges = false;

        // 遍历所有申请，查找该用户的历史审批记录
        applications.forEach(app => {
            if (!app.approvals) return;

            // 处理从经理角色变更为其他角色的情况
            if (originalRole === 'manager' && app.approvals.managers && app.approvals.managers[username]) {
                const managerApproval = app.approvals.managers[username];
                console.log(`发现用户 ${username} 在申请 ${app.id} 中的经理审批记录`);

                // 在审批记录中添加角色变更标记，但保留原始审批记录
                managerApproval.originalRole = 'manager';
                managerApproval.roleChangedTo = newRole;
                managerApproval.roleChangeDate = new Date().toISOString();

                hasChanges = true;
            }

            // 处理从厂长角色变更为其他角色的情况
            if (originalRole === 'director' && app.approvals.directors && app.approvals.directors[username]) {
                const directorApproval = app.approvals.directors[username];
                console.log(`发现用户 ${username} 在申请 ${app.id} 中的厂长审批记录`);

                // 在审批记录中添加角色变更标记，但保留原始审批记录
                directorApproval.originalRole = 'director';
                directorApproval.roleChangedTo = newRole;
                directorApproval.roleChangeDate = new Date().toISOString();

                hasChanges = true;
            }

            // 处理从总监角色变更为其他角色的情况
            if (originalRole === 'chief' && app.approvals.chief &&
                (app.approvals.chief.status === 'approved' || app.approvals.chief.status === 'rejected')) {
                console.log(`发现用户 ${username} 在申请 ${app.id} 中的总监审批记录`);

                // 在审批记录中添加角色变更标记，但保留原始审批记录
                app.approvals.chief.originalRole = 'chief';
                app.approvals.chief.roleChangedTo = newRole;
                app.approvals.chief.roleChangeDate = new Date().toISOString();
                app.approvals.chief.approverUsername = username; // 记录审批人用户名

                hasChanges = true;
            }

            // 处理从CEO角色变更为其他角色的情况
            if (originalRole === 'ceo' && app.approvals.ceo &&
                (app.approvals.ceo.status === 'approved' || app.approvals.ceo.status === 'rejected')) {
                console.log(`发现用户 ${username} 在申请 ${app.id} 中的CEO审批记录`);

                // 在审批记录中添加角色变更标记，但保留原始审批记录
                app.approvals.ceo.originalRole = 'ceo';
                app.approvals.ceo.roleChangedTo = newRole;
                app.approvals.ceo.roleChangeDate = new Date().toISOString();
                app.approvals.ceo.approverUsername = username; // 记录审批人用户名

                hasChanges = true;
            }
        });

        // 如果有变更，保存申请数据
        if (hasChanges) {
            const saveResult = saveApplications(applications);
            if (saveResult) {
                console.log(`用户 ${username} 的历史审批记录已成功更新并保留`);
            } else {
                console.error(`保存用户 ${username} 的历史审批记录时出错`);
            }
        } else {
            console.log(`用户 ${username} 没有需要更新的历史审批记录`);
        }

    } catch (error) {
        console.error(`处理用户 ${username} 角色变更时的历史审批记录出错:`, error);
    }
}

// 归档附件函数
function archiveAttachments(application) {
    try {
        console.log('开始归档附件，申请ID:', application.id);

        // 收集所有附件
        const attachments = [
            ...(application.attachments || [])
        ];

        // 收集所有厂长的附件
        if (application.approvals.directors) {
            Object.values(application.approvals.directors).forEach(director => {
                if (director.attachments && director.attachments.length > 0) {
                    console.log(`收集厂长附件: ${director.attachments.length}个`);
                    attachments.push(...director.attachments);
                }
            });
        }

        // 收集总监的附件
        if (application.approvals.chief && application.approvals.chief.attachments) {
            console.log(`收集总监附件: ${application.approvals.chief.attachments.length}个`);
            attachments.push(...application.approvals.chief.attachments);
        }

        // 收集所有经理的附件
        if (application.approvals.managers) {
            Object.values(application.approvals.managers).forEach(manager => {
                if (manager.attachments && manager.attachments.length > 0) {
                    console.log(`收集经理附件: ${manager.attachments.length}个`);
                    attachments.push(...manager.attachments);
                }
            });
        }

        // 收集CEO的附件
        if (application.approvals.ceo && application.approvals.ceo.attachments) {
            console.log(`收集CEO附件: ${application.approvals.ceo.attachments.length}个`);
            attachments.push(...application.approvals.ceo.attachments);
        }

        console.log(`总共收集到 ${attachments.length} 个附件`);

        // 创建附件归档目录（使用attachmentArchiveDir）
        if (!fs.existsSync(attachmentArchiveDir)) {
            fs.mkdirSync(attachmentArchiveDir, { recursive: true });
        }

        // 为每个申请创建一个子目录
        const appDir = path.join(attachmentArchiveDir, `app_${application.id}`);
        if (!fs.existsSync(appDir)) {
            fs.mkdirSync(appDir, { recursive: true });
        }

        // 复制所有附件到归档目录
        let successCount = 0;
        attachments.forEach(attachment => {
            try {
                if (!attachment || !attachment.path) {
                    console.log('跳过无效附件:', attachment);
                    return;
                }

                const sourcePath = path.join(__dirname, '..', 'uploads', attachment.path);
                const destPath = path.join(appDir, attachment.path);

                if (fs.existsSync(sourcePath)) {
                    fs.copyFileSync(sourcePath, destPath);
                    successCount++;
                } else {
                    console.log(`附件文件不存在: ${sourcePath}`);
                }
            } catch (attachError) {
                console.error('处理单个附件时出错:', attachError);
            }
        });

        console.log(`成功归档 ${successCount}/${attachments.length} 个附件`);
    } catch (error) {
        console.error('归档附件时出错:', error);
    }
}

// 获取所有厂长和经理用户接口
app.get('/approvers', (req, res) => {
    try {
        const users = getUsers();
        const directors = users.filter(user => user.role === 'director' || user.role === 'chief').map(user => ({
            username: user.username,
            department: user.department
        }));
        const managers = users.filter(user => user.role === 'manager').map(user => ({
            username: user.username
        }));

        res.json({
            success: true,
            directors,
            managers
        });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取审批人列表失败' });
    }
});

// 导出用户数据为CSV格式（仅管理员）
app.get('/exportUsers', (req, res) => {
    const { username } = req.query;
    const users = getUsers();

    // 检查权限
    const adminUser = users.find(u => u.username === username);
    if (!adminUser || adminUser.role !== 'admin') {
        return res.status(403).json({ success: false, message: '权限不足，只有管理员可以导出用户数据' });
    }

    // 创建CSV内容
    let csvContent = 'username,password,role,email,department,userCode\n';
    users.forEach(user => {
        // 过滤掉签名数据，因为它是base64格式，不适合CSV
        const { signature, ...userData } = user;
        const row = [
            userData.username || '',
            userData.password || '',
            userData.role || '',
            userData.email || '',
            userData.department || '',
            userData.userCode || ''
        ].map(field => {
            // 处理可能包含逗号、引号或换行符的字段
            const fieldStr = String(field);
            if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
                return `"${fieldStr.replace(/"/g, '""')}"`;
            }
            return fieldStr;
        }).join(',');
        csvContent += row + '\n';
    });

    // 设置响应头，使浏览器下载文件
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');

    // 添加BOM标记以确保Excel正确识别UTF-8编码
    const BOM = '\uFEFF';
    res.send(BOM + csvContent);
});

// 导入CSV用户数据（仅管理员）
app.post('/importUsers', express.text({ type: 'text/csv', limit: '1mb' }), (req, res) => {
    const { username } = req.query;
    let users = getUsers();

    // 检查权限
    const adminUser = users.find(u => u.username === username);
    if (!adminUser || adminUser.role !== 'admin') {
        return res.status(403).json({ success: false, message: '权限不足，只有管理员可以导入用户数据' });
    }

    try {
        // 移除BOM标记（如果存在）
        let csvData = req.body;
        if (csvData.charCodeAt(0) === 0xFEFF) {
            csvData = csvData.substring(1);
        }

        // 解析CSV数据
        const lines = csvData.split(/\r?\n/);
        const headers = lines[0].split(',').map(header => header.trim());

        // 验证CSV格式
        const requiredHeaders = ['username', 'password', 'role'];
        for (const header of requiredHeaders) {
            if (!headers.includes(header)) {
                return res.status(400).json({
                    success: false,
                    message: `CSV格式错误：缺少必要的列 "${header}"`
                });
            }
        }

        // 解析CSV数据
        const importedUsers = [];
        const errors = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue; // 跳过空行

            // 解析CSV行，正确处理引号包裹的字段
            const values = [];
            let currentValue = '';
            let insideQuotes = false;

            for (let j = 0; j < lines[i].length; j++) {
                const char = lines[i][j];

                if (char === '"') {
                    if (insideQuotes && j + 1 < lines[i].length && lines[i][j + 1] === '"') {
                        // 处理双引号转义 ("" -> ")
                        currentValue += '"';
                        j++; // 跳过下一个引号
                    } else {
                        // 切换引号状态
                        insideQuotes = !insideQuotes;
                    }
                } else if (char === ',' && !insideQuotes) {
                    // 字段结束
                    values.push(currentValue);
                    currentValue = '';
                } else {
                    // 普通字符
                    currentValue += char;
                }
            }

            // 添加最后一个字段
            values.push(currentValue);

            if (values.length !== headers.length) {
                errors.push(`第${i}行: 列数不匹配，期望${headers.length}列，实际${values.length}列`);
                continue;
            }

            const user = {};
            headers.forEach((header, index) => {
                user[header] = values[index];
            });

            // 验证必填字段
            if (!user.username || !user.password || !user.role) {
                errors.push(`第${i}行: 用户名、密码和角色为必填项`);
                continue;
            }

            // 验证用户代码格式（如果提供）
            if (user.userCode) {
                if (!/^[A-Za-z0-9]{6}$/.test(user.userCode)) {
                    errors.push(`第${i}行: 用户代码必须是6位字母或数字组合`);
                    continue;
                }
            }

            // 验证角色是否有效
            const validRoles = ['user', 'director', 'chief', 'manager', 'ceo', 'admin', 'readonly'];
            if (!validRoles.includes(user.role)) {
                errors.push(`第${i}行: 无效的角色 "${user.role}"`);
                continue;
            }

            importedUsers.push(user);
        }

        // 检查用户代码是否重复（在导入数据内部）
        const importUserCodes = new Set();

        for (const user of importedUsers) {
            if (user.userCode && importUserCodes.has(user.userCode)) {
                errors.push(`导入数据中用户代码 "${user.userCode}" 重复`);
                continue;
            }

            if (user.userCode) {
                importUserCodes.add(user.userCode);
            }
        }

        // 如果有错误，返回错误信息
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: '导入过程中发现错误',
                errors
            });
        }

        // 处理用户数据更新和添加
        const updatedUsers = [...users]; // 复制现有用户数组
        let addedCount = 0;
        let updatedCount = 0;

        for (const importedUser of importedUsers) {
            // 检查用户名是否已存在
            const existingUserIndex = updatedUsers.findIndex(u => u.username === importedUser.username);

            if (existingUserIndex !== -1) {
                // 用户已存在，更新信息（保留电子签名）
                const existingSignature = updatedUsers[existingUserIndex].signature;

                // 检查是否有其他用户已经使用了这个用户代码
                if (importedUser.userCode &&
                    updatedUsers.some(u => u.userCode === importedUser.userCode && u.username !== importedUser.username)) {
                    errors.push(`用户代码 "${importedUser.userCode}" 已被其他用户使用`);
                    continue;
                }

                // 更新用户信息，保留电子签名
                updatedUsers[existingUserIndex] = {
                    ...importedUser,
                    signature: existingSignature
                };
                updatedCount++;
            } else {
                // 新用户，检查用户代码是否已被使用
                if (importedUser.userCode &&
                    updatedUsers.some(u => u.userCode === importedUser.userCode)) {
                    errors.push(`用户代码 "${importedUser.userCode}" 已被其他用户使用`);
                    continue;
                }

                // 添加新用户，设置电子签名为null
                updatedUsers.push({
                    ...importedUser,
                    signature: null
                });
                addedCount++;
            }
        }

        // 如果有错误，返回错误信息
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: '导入过程中发现错误',
                errors
            });
        }

        // 保存更新后的用户数据
        saveUsers(updatedUsers);

        res.json({
            success: true,
            message: `导入成功：添加了 ${addedCount} 个新用户，更新了 ${updatedCount} 个现有用户`
        });
    } catch (error) {
        console.error('导入用户数据失败:', error);
        res.status(500).json({
            success: false,
            message: '导入用户数据失败: ' + error.message
        });
    }
});

// 根路径路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// 测试页面路由
app.get('/test-frontend-settings.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'test-frontend-settings.html'));
});

// 优先级转换为中文函数
function getPriorityInChinese(priority) {
    switch(priority) {
        case 'high':
            return '紧急';
        case 'medium':
            return '中等';
        case 'normal':
            return '普通';
        default:
            return priority;
    }
}



// 根据申请的审批流程生成动态的邮件状态描述
function getEmailStatusDescription(status, app) {
    switch (status) {
        case '待厂长审核':
            return '待您审批';

        case '待总监审批':
            // 检查是否经过了厂长审批
            const hasDirectorApprovals = app.approvals && app.approvals.directors &&
                Object.keys(app.approvals.directors).length > 0 &&
                Object.values(app.approvals.directors).some(d => d.status === 'approved');

            if (hasDirectorApprovals) {
                return '已通过厂长审核，待您审批';
            } else {
                return '待您审批';
            }

        case '待经理审批':
            // 检查审批流程
            const hasDirectorApprovalsForManager = app.approvals && app.approvals.directors &&
                Object.values(app.approvals.directors).some(d => d.status === 'approved');
            const hasChiefApprovalForManager = app.approvals && app.approvals.chief &&
                app.approvals.chief.status === 'approved';

            if (hasDirectorApprovalsForManager && hasChiefApprovalForManager) {
                return '已通过厂长和总监审核，待您审批';
            } else if (hasChiefApprovalForManager) {
                return '已通过总监审核，待您审批';
            } else {
                return '待您审批';
            }

        case '待CEO审批':
            // 检查审批流程
            const hasDirectorApprovalsForCEO = app.approvals && app.approvals.directors &&
                Object.values(app.approvals.directors).some(d => d.status === 'approved');
            const hasChiefApprovalForCEO = app.approvals && app.approvals.chief &&
                app.approvals.chief.status === 'approved';
            const hasManagerApprovals = app.approvals && app.approvals.managers &&
                Object.keys(app.approvals.managers).length > 0 &&
                Object.values(app.approvals.managers).some(m => m.status === 'approved');

            if (hasManagerApprovals) {
                if (hasDirectorApprovalsForCEO) {
                    return '已通过厂长、总监和经理审核，待您最终审批';
                } else {
                    return '已通过总监和经理审核，待您最终审批';
                }
            } else if (hasChiefApprovalForCEO) {
                if (hasDirectorApprovalsForCEO) {
                    return '已通过厂长和总监审核，待您审批';
                } else {
                    return '已通过总监审核，待您审批';
                }
            } else {
                return '待您审批';
            }

        default:
            return status;
    }
}

// 生成统一的邮件HTML模板
function generateEmailTemplate(data) {
    const {
        title,
        applicant,
        applicationCode,
        department,
        date,
        content,
        priority,
        status,
        actionText = '立即审批',
        actionUrl = SERVER_CONFIG.url,
        urgencyNote = '',
        additionalInfo = '',
        footerNote = ''
    } = data;

    // 获取优先级的中文显示和颜色
    const priorityInfo = getPriorityInfo(priority);

    return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${title}</title>
    <!--[if mso]>
    <xml>
        <o:OfficeDocumentSettings>
            <o:AllowPNG/>
            <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
    </xml>
    <![endif]-->
    <style type="text/css">
        /* 基础样式 */
        #outlook a {padding:0;}
        body {
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.5;
            color: #333333;
        }
        table, td {
            border-collapse: collapse;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }
        img {
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
            -ms-interpolation-mode: bicubic;
        }
        p {
            display: block;
            margin: 13px 0;
        }
        /* 容器样式 */
        .email-container {
            width: 100%;
            max-width: 560px;
            margin: 0 auto;
            border: 1px solid #dddddd;
        }
        .email-header {
            background-color: #3b82f6;
            color: #ffffff;
            padding: 20px 24px;
            text-align: center;
        }
        .email-header h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            color: #ffffff;
        }
        .email-body {
            padding: 20px 24px;
            background-color: #ffffff;
        }
        .application-card {
            background-color: #f8f9fa;
            border: 1px solid #dddddd;
            border-left: 3px solid #3b82f6;
            padding: 16px;
            margin-bottom: 16px;
        }
        .info-row {
            margin-bottom: 8px;
        }
        .info-label {
            font-weight: 600;
            color: #495057;
            width: 80px;
            padding-right: 10px;
            font-size: 14px;
            vertical-align: top;
        }
        .info-value {
            color: #212529;
            font-size: 14px;
            vertical-align: top;
        }
        .priority-badge {
            display: inline-block;
            padding: 3px 10px;
            font-size: 11px;
            font-weight: 600;
            border-radius: 3px;
        }
        .priority-high {
            background-color: #dc3545;
            color: #ffffff;
        }
        .priority-medium {
            background-color: #fd7e14;
            color: #ffffff;
        }
        .priority-low {
            background-color: #e8f5e8;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .urgency-alert {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 12px;
            margin-bottom: 16px;
            color: #856404;
            font-size: 14px;
        }
        .urgency-alert strong {
            color: #dc3545;
        }
        .action-button {
            background-color: #3b82f6;
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 24px;
            font-weight: 600;
            font-size: 14px;
            display: inline-block;
            text-align: center;
            line-height: 1.5;
            border-radius: 4px;
            mso-padding-alt: 14px 24px;
        }
        .additional-info {
            background-color: #e9ecef;
            padding: 12px;
            margin: 16px 0;
            font-size: 13px;
        }
        .email-footer {
            background-color: #f8f9fa;
            padding: 16px 24px;
            border-top: 1px solid #dee2e6;
            text-align: center;
            font-size: 11px;
            color: #6c757d;
        }
        .system-note {
            font-style: italic;
            color: #6c757d;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #dee2e6;
            font-size: 13px;
        }
        /* Outlook特定样式 */
        .ExternalClass {
            width: 100%;
        }
        .ExternalClass,
        .ExternalClass p,
        .ExternalClass span,
        .ExternalClass font,
        .ExternalClass td,
        .ExternalClass div {
            line-height: 100%;
        }
        .ReadMsgBody {
            width: 100%;
        }
    </style>
    <!--[if mso]>
    <style type="text/css">
        /* Outlook特定样式 */
        body, table, td, p, a, li, blockquote {
            font-family: Arial, sans-serif !important;
        }
        .action-button {
            font-family: Arial, sans-serif !important;
            font-size: 14px !important;
            font-weight: 600 !important;
            text-decoration: none !important;
        }
        table {
            border-collapse: collapse !important;
        }
        .priority-badge {
            font-family: Arial, sans-serif !important;
            font-size: 11px !important;
            font-weight: 600 !important;
            padding: 3px 10px !important;
        }
    </style>
    <![endif]-->
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5;">
    <!--[if mso | IE]>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
    <td align="center" valign="top">
    <![endif]-->

    <div style="max-width:600px; margin:0 auto; padding:16px; text-align:center;">
        <table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px; margin:0 auto; border:1px solid #dddddd; background-color:#ffffff; text-align:left;">
            <!-- 邮件头部 -->
            <tr>
                <td style="background-color:#3b82f6; padding:20px 24px; text-align:center;">
                    <h1 style="margin:0; font-size:20px; font-weight:600; color:#ffffff;">${title}</h1>
                </td>
            </tr>

            <!-- 邮件正文 -->
            <tr>
                <td style="padding:20px 24px; background-color:#ffffff;">
                    ${urgencyNote ? `<div style="background-color:#fff3cd; border:1px solid #ffeaa7; padding:12px; margin-bottom:16px; color:#856404; font-size:14px;">${urgencyNote}</div>` : ''}

                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8f9fa; border:1px solid #dddddd; border-left:3px solid #3b82f6; padding:16px; margin-bottom:16px;">
                        <tr>
                            <td>
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="font-weight:600; color:#495057; width:80px; padding-right:10px; font-size:14px; vertical-align:top; padding-bottom:8px;">申请编号:</td>
                                        <td style="color:#212529; font-size:14px; vertical-align:top; padding-bottom:8px;">${applicationCode || '无编号'}</td>
                                    </tr>
                                    <tr>
                                        <td style="font-weight:600; color:#495057; width:80px; padding-right:10px; font-size:14px; vertical-align:top; padding-bottom:8px;">申请人:</td>
                                        <td style="color:#212529; font-size:14px; vertical-align:top; padding-bottom:8px;">${applicant}</td>
                                    </tr>
                                    <tr>
                                        <td style="font-weight:600; color:#495057; width:80px; padding-right:10px; font-size:14px; vertical-align:top; padding-bottom:8px;">部门:</td>
                                        <td style="color:#212529; font-size:14px; vertical-align:top; padding-bottom:8px;">${department}</td>
                                    </tr>
                                    <tr>
                                        <td style="font-weight:600; color:#495057; width:80px; padding-right:10px; font-size:14px; vertical-align:top; padding-bottom:8px;">日期:</td>
                                        <td style="color:#212529; font-size:14px; vertical-align:top; padding-bottom:8px;">${date}</td>
                                    </tr>
                                    <tr>
                                        <td style="font-weight:600; color:#495057; width:80px; padding-right:10px; font-size:14px; vertical-align:top; padding-bottom:8px;">内容:</td>
                                        <td style="color:#212529; font-size:14px; vertical-align:top; padding-bottom:8px;">${content}</td>
                                    </tr>
                                    ${priority ? `
                                    <tr>
                                        <td style="font-weight:600; color:#495057; width:80px; padding-right:10px; font-size:14px; vertical-align:top; padding-bottom:8px;">紧急程度:</td>
                                        <td style="color:#212529; font-size:14px; vertical-align:top; padding-bottom:8px;">
                                            ${priorityInfo.cssClass === 'high' ?
                                                `<span style="display:inline-block; padding:3px 10px; font-size:11px; font-weight:600; background-color:#dc3545; color:#ffffff; border-radius:3px;">${priorityInfo.text}</span>` :
                                                priorityInfo.cssClass === 'medium' ?
                                                `<span style="display:inline-block; padding:3px 10px; font-size:11px; font-weight:600; background-color:#fd7e14; color:#ffffff; border-radius:3px;">${priorityInfo.text}</span>` :
                                                `<span style="display:inline-block; padding:3px 10px; font-size:11px; font-weight:600; background-color:#e8f5e8; color:#155724; border:1px solid #c3e6cb; border-radius:3px;">${priorityInfo.text}</span>`
                                            }
                                        </td>
                                    </tr>
                                    ` : ''}
                                    ${status ? `
                                    <tr>
                                        <td style="font-weight:600; color:#495057; width:80px; padding-right:10px; font-size:14px; vertical-align:top; padding-bottom:8px;">当前状态:</td>
                                        <td style="color:#212529; font-size:14px; vertical-align:top; padding-bottom:8px;">${status}</td>
                                    </tr>
                                    ` : ''}
                                </table>
                            </td>
                        </tr>
                    </table>

                    ${additionalInfo ? `<div style="background-color:#e9ecef; padding:12px; margin:16px 0; font-size:13px;">${additionalInfo}</div>` : ''}

                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td align="center" style="padding:16px 0;">
                                <!--[if mso]>
                                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${actionUrl}" style="height:50px;v-text-anchor:middle;width:200px;" arcsize="10%" strokecolor="#3b82f6" fillcolor="#3b82f6">
                                    <w:anchorlock/>
                                    <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">${actionText}</center>
                                </v:roundrect>
                                <![endif]-->
                                <!--[if !mso]><!-->
                                <a href="${actionUrl}" style="background-color:#3b82f6; color:#ffffff; text-decoration:none; padding:14px 24px; font-weight:600; font-size:14px; display:inline-block; text-align:center; line-height:1.5; border-radius:4px;">${actionText}</a>
                                <!--<![endif]-->
                            </td>
                        </tr>
                    </table>

                    ${footerNote ? `<div style="font-style:italic; color:#6c757d; margin-top:12px; padding-top:12px; border-top:1px solid #dee2e6; font-size:13px;">${footerNote}</div>` : ''}
                </td>
            </tr>

            <!-- 邮件底部 -->
            <tr>
                <td style="background-color:#f8f9fa; padding:16px 24px; border-top:1px solid #dee2e6; text-align:center; font-size:11px; color:#6c757d;">
                    此邮件由系统自动发送，请勿直接回复。<br>
                    如有问题，请直接登录系统或联系管理员。
                </td>
            </tr>
        </table>
    </div>

    <!--[if mso | IE]>
    </td>
    </tr>
    </table>
    <![endif]-->
</body>
</html>
    `;
}

// 获取优先级信息
function getPriorityInfo(priority) {
    switch (priority) {
        case 'high':
            return { text: '紧急', cssClass: 'high' };
        case 'medium':
            return { text: '中等', cssClass: 'medium' };
        case 'normal':
        case 'low':
        default:
            return { text: '普通', cssClass: 'low' };
    }
}

// 发送邮件提醒函数
async function sendEmailNotification(recipients, subject, content, applicationCode = null) {
    // 如果没有收件人，直接返回失败
    if (!recipients || (Array.isArray(recipients) && recipients.length === 0) || recipients === '') {
        const logPrefix = applicationCode ? `申请 ${applicationCode}: ` : '';
        logWithTime(`${logPrefix}邮件发送失败: 没有有效的收件人`);
        return false;
    }

    // 重试计数器
    let retryCount = 0;
    let hasLoggedFailure = false; // 标记是否已记录失败日志

    // 定义发送函数
    const sendMail = async () => {
        try {
            // 如果收件人是数组，则转换为逗号分隔的字符串
            const to = Array.isArray(recipients) ? recipients.join(',') : recipients;

            const mailOptions = {
                from: '"申请审批系统" <makrite.zhimian@gmail.com>',
                to: to,
                subject: subject,
                html: content
            };

            const info = await transporter.sendMail(mailOptions);
            const logPrefix = applicationCode ? `申请 ${applicationCode}: ` : '';
            logWithTime(`${logPrefix}邮件发送成功:`, info.messageId);
            return true;
        } catch (error) {
            // 只在第一次失败时记录详细错误信息
            if (!hasLoggedFailure) {
                const logPrefix = applicationCode ? `申请 ${applicationCode}: ` : '';
                errorWithTime(`${logPrefix}邮件发送失败，开始重试中...`, error.message);
                hasLoggedFailure = true;
            }

            retryCount++;

            // 等待一段时间后重试（无限重试直到成功）
            await new Promise(resolve => setTimeout(resolve, SERVER_CONFIG.emailRetryDelay));
            return await sendMail();
        }
    };

    // 开始发送邮件
    return await sendMail();
}

// 获取用户邮箱函数
function getUserEmails(usernames) {
    try {
        const users = getUsers();
        const emails = [];

        usernames.forEach(username => {
            const user = users.find(u => u.username === username);
            if (user && user.email) {
                emails.push(user.email);
            }
        });

        return emails;
    } catch (error) {
        console.error('获取用户邮箱失败:', error);
        return [];
    }
}

// 总监撤回审批接口
app.post('/withdrawApproval', (req, res) => {
    const { id, username, role } = req.body;
    let applications = getApplications();
    const appIndex = applications.findIndex(a => a.id === parseInt(id));

    if (appIndex === -1) {
        return res.json({ success: false, message: '申请不存在' });
    }

    const app = applications[appIndex];

    // 验证请求用户是否为总监，只读角色不能撤回审批
    if (role !== 'chief') {
        return res.status(403).json({ success: false, message: '权限不足，只有总监可以撤回审批' });
    }

    // 验证申请状态是否为"已通过"且是由总监直接通过的（未经过经理和CEO审批）
    if (app.status !== '已通过' ||
        !app.approvals.chief ||
        app.approvals.chief.status !== 'approved' ||
        (app.approvals.managers && Object.keys(app.approvals.managers).length > 0) ||
        (app.approvals.ceo && app.approvals.ceo.status && app.approvals.ceo.status !== 'pending')) {
        return res.json({
            success: false,
            message: '只能撤回由总监直接通过且未经过经理和CEO审批的申请'
        });
    }

    // 将申请状态重置为"待总监审批"
    app.status = '待总监审批';

    // 重置总监审批状态
    app.approvals.chief.status = 'pending';

    // 重置提醒信息，因为重新进入审批阶段
    if (app.reminderInfo) {
        app.reminderInfo.lastReminderTime = null;
        app.reminderInfo.reminderCount = 0;
        app.reminderInfo.escalationLevel = 'normal';
    }

    // 重置并记录总监审批阶段开始时间
    if (!app.stageTimestamps) {
        app.stageTimestamps = {};
    }
    app.stageTimestamps.chiefStageStartTime = new Date().toISOString();

    // 记录撤回操作
    app.approvals.chief.withdrawnAt = new Date().toISOString();
    app.approvals.chief.withdrawnBy = username;

    // 保存更新后的申请
    saveApplications(applications);

    // 发送邮件通知申请人
    const users = getUsers();
    let applicantUser = users.find(user => user.username === app.username);
    if (!applicantUser) {
        applicantUser = users.find(user => user.username === app.applicant);
    }

    if (applicantUser && applicantUser.email) {
        const emailSubject = `您的申请被总监撤回重审 - ${app.applicationCode || ''}`;
        const emailContent = generateEmailTemplate({
            title: '您的申请被总监撤回进行重新审批',
            applicant: app.applicant,
            applicationCode: app.applicationCode || '无编号',
            department: app.department,
            date: app.date,
            content: app.content,
            priority: app.priority,
            status: '待总监审批',
            actionText: '查看详情',
            actionUrl: SERVER_CONFIG.url,
            additionalInfo: '总监已撤回此前的审批决定，申请将重新进入总监审批环节。'
        });
        sendEmailNotification(applicantUser.email, emailSubject, emailContent, app.applicationCode)
            .then(success => {
                console.log('申请人撤回通知邮件状态:', success ? '成功' : '失败');
            });
    }

    res.json({ success: true, message: '审批已成功撤回，申请已重新进入总监审批环节', application: app });
});

// 导出申请记录为Excel格式
app.get('/exportApplications', async (req, res) => {
    const { username, role, timeRange, startDate, endDate } = req.query;

    // 使用getAllApplications()获取所有数据（包括归档）
    const applications = getAllApplications({ includeAll: true });

    // 检查用户是否存在
    const users = getUsers();
    const user = users.find(u => u.username === username);
    if (!user) {
        return res.status(403).json({ success: false, message: '用户不存在' });
    }

    // 根据用户角色筛选可见的申请
    let filteredApps = [];

    if (role === 'admin' || role === 'readonly') {
        // 管理员和只读用户可以看到所有申请
        filteredApps = applications;
    } else {
        // 所有其他用户（包括普通用户、厂长、总监、经理）只能看到自己提交的申请
        filteredApps = applications.filter(app => app.username === username);
    }

    // 检查是否提供了自定义日期范围
    if (startDate && endDate) {
        // 使用自定义日期范围筛选
        const start = new Date(startDate);
        // 将结束日期设置为当天的23:59:59，以包含整个结束日期
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        filteredApps = filteredApps.filter(app => {
            const appDate = new Date(app.date);
            return appDate >= start && appDate <= end;
        });
    }
    // 如果没有提供自定义日期范围，则使用预设的时间范围
    else if (timeRange && timeRange !== 'all') {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        let startDate;
        if (timeRange === 'week') {
            // 本周（从本周一开始）
            const day = startOfDay.getDay() || 7; // 如果是周日，getDay()返回0，我们将其视为7
            startDate = new Date(startOfDay);
            startDate.setDate(startOfDay.getDate() - day + 1);
        } else if (timeRange === 'month') {
            // 本月（从1号开始）
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (timeRange === 'year') {
            // 本年（从1月1日开始）
            startDate = new Date(now.getFullYear(), 0, 1);
        }

        if (startDate) {
            filteredApps = filteredApps.filter(app => {
                const appDate = new Date(app.date);
                return appDate >= startDate;
            });
        }
    }

    // 按日期倒序排序
    filteredApps.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 创建Excel工作簿
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('申请记录');

    // 设置列
    worksheet.columns = [
        { header: '申请编号', key: 'applicationCode', width: 15 },
        { header: '申请人', key: 'applicant', width: 12 },
        { header: '部门', key: 'department', width: 15 },
        { header: '申请日期', key: 'date', width: 15 },
        { header: '紧急程度', key: 'priority', width: 10 },
        { header: '申请内容', key: 'content', width: 40 },
        { header: '申请金额', key: 'amount', width: 12 },
        { header: '币种', key: 'currency', width: 8 },
        { header: '状态', key: 'status', width: 12 }
    ];

    // 设置表头样式
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // 添加数据
    filteredApps.forEach(app => {
        // 格式化金额
        const amount = app.amount ? parseFloat(app.amount).toFixed(2) : '0.00';
        // 格式化优先级
        const priority = getPriorityInChinese(app.priority);

        worksheet.addRow({
            applicationCode: app.applicationCode || '',
            applicant: app.applicant || '',
            department: app.department || '',
            date: app.date || '',
            priority: priority || '普通',
            content: app.content || '',
            amount: amount,
            currency: app.currency || 'CNY',
            status: app.status || ''
        });
    });

    // 设置金额列的格式
    worksheet.getColumn('amount').numFmt = '#,##0.00';

    // 设置所有单元格的对齐方式
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) { // 跳过表头
            row.eachCell((cell) => {
                cell.alignment = { vertical: 'middle', wrapText: true };
            });
        }
    });

    // 设置响应头，使浏览器下载文件
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // 设置文件名
    let fileName = '';

    // 检查是否使用了自定义日期范围
    if (startDate && endDate) {
        fileName = `申请记录_${startDate}_至_${endDate}.xlsx`;
    } else {
        // 根据时间范围设置文件名
        let timeRangeText = '';
        switch(timeRange) {
            case 'week':
                timeRangeText = '本周';
                break;
            case 'month':
                timeRangeText = '本月';
                break;
            case 'year':
                timeRangeText = '本年';
                break;
            default:
                timeRangeText = '全部';
        }

        // 设置文件名，包含当前日期
        const today = new Date().toISOString().slice(0, 10);
        fileName = `申请记录_${timeRangeText}_${today}.xlsx`;
    }

    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(fileName)}`);

    // 将工作簿写入响应
    await workbook.xlsx.write(res);
    res.end();
});

// 静默模式标志，启动后第一次检查后设为true
let silentMode = false;

// 定期提醒功能
function checkAndSendReminders() {
    try {
        const applications = getApplications();
        const users = getUsers();
        const reminderSettings = getReminderSettings();
        const now = new Date();

        // 检查时间控制设置
        if (!isReminderTimeAllowed(reminderSettings.timeControl || {})) {
            // 只在非静默模式下显示时间控制提示
            if (!silentMode) {
                logWithTime('当前时间不允许发送提醒邮件（时间控制设置）');
                // 第一次检查完成后启用静默模式
                silentMode = true;
                logWithTime('提醒检查系统已进入静默模式，后续检查将静默运行');
            }
            return;
        }

        // 筛选出需要提醒的申请（待审批状态）
        const pendingApplications = applications.filter(app =>
            app.status === '待厂长审核' ||
            app.status === '待总监审批' ||
            app.status === '待经理审批' ||
            app.status === '待CEO审批'
        );

        // 只在非静默模式下显示检查信息
        if (!silentMode) {
            logWithTime(`检查提醒任务: 找到 ${pendingApplications.length} 个待审批申请`);
        }

        pendingApplications.forEach(app => {
            // 确保提醒信息字段存在（兼容旧数据）
            if (!app.reminderInfo) {
                app.reminderInfo = {
                    lastReminderTime: null,
                    reminderCount: 0,
                    escalationLevel: 'normal'
                };
            }

            // 计算当前审批层级的等待时间
            let stageStartTime;
            if (app.status === '待厂长审核') {
                stageStartTime = app.stageTimestamps?.directorStageStartTime || app.id;
            } else if (app.status === '待总监审批') {
                stageStartTime = app.stageTimestamps?.chiefStageStartTime || app.id;
            } else if (app.status === '待经理审批') {
                stageStartTime = app.stageTimestamps?.managerStageStartTime || app.id;
            } else if (app.status === '待CEO审批') {
                stageStartTime = app.stageTimestamps?.ceoStageStartTime || app.id;
            } else {
                // 如果状态不匹配，使用申请提交时间作为后备
                stageStartTime = app.id;
            }

            const stageStart = new Date(stageStartTime);
            const waitingHours = (now - stageStart) / (1000 * 60 * 60);

            // 获取该申请的提醒策略
            const strategy = getApplicationReminderStrategy(app, reminderSettings);

            // 确定当前应该的提醒级别
            let currentLevel = 'normal';
            if (waitingHours >= 48) {
                currentLevel = 'urgent';
            } else if (waitingHours >= 24) {
                currentLevel = 'medium';
            }

            // 根据策略确定提醒间隔（小时）
            let reminderInterval = strategy.normalInterval;
            if (currentLevel === 'medium') {
                reminderInterval = strategy.mediumInterval;
            } else if (currentLevel === 'urgent') {
                reminderInterval = strategy.urgentInterval;
            }

            // 检查是否需要发送提醒
            let shouldSendReminder = false;
            let reasonForReminder = '';

            if (!app.reminderInfo.lastReminderTime) {
                // 如果从未发送过提醒，且申请已等待超过初始延迟时间，则发送
                if (waitingHours >= strategy.initialDelay) {
                    shouldSendReminder = true;
                    reasonForReminder = `首次提醒 (等待${Math.floor(waitingHours)}小时 >= 初始延迟${strategy.initialDelay}小时)`;
                } else {
                    reasonForReminder = `等待时间不足 (等待${Math.floor(waitingHours)}小时 < 初始延迟${strategy.initialDelay}小时)`;
                }
            } else {
                // 检查距离上次提醒是否已超过间隔时间
                const lastReminderTime = new Date(app.reminderInfo.lastReminderTime);
                const hoursSinceLastReminder = (now - lastReminderTime) / (1000 * 60 * 60);

                if (hoursSinceLastReminder >= reminderInterval) {
                    shouldSendReminder = true;
                    reasonForReminder = `间隔提醒 (距上次${Math.floor(hoursSinceLastReminder)}小时 >= 间隔${reminderInterval}小时)`;
                } else {
                    reasonForReminder = `间隔时间不足 (距上次${Math.floor(hoursSinceLastReminder)}小时 < 间隔${reminderInterval}小时)`;
                }
            }

            // 只在非静默模式下或需要发送提醒时记录详细日志
            if (!silentMode || shouldSendReminder) {
                logWithTime(`申请 ${app.applicationCode || app.id}: ${reasonForReminder}, 级别=${currentLevel}, 策略=${JSON.stringify(strategy)}`);
            }

            if (shouldSendReminder) {
                sendReminderEmail(app, users, currentLevel, waitingHours);

                // 更新提醒信息
                app.reminderInfo.lastReminderTime = now.toISOString();
                app.reminderInfo.reminderCount += 1;
                app.reminderInfo.escalationLevel = currentLevel;
            }
        });

        // 保存更新后的申请数据
        if (pendingApplications.length > 0) {
            saveApplications(applications);
        }

        // 第一次检查完成后启用静默模式
        if (!silentMode) {
            silentMode = true;
            logWithTime('提醒检查系统已进入静默模式，后续检查将静默运行');
        }

    } catch (error) {
        errorWithTime('检查提醒任务出错:', error);
    }
}

// 获取申请的提醒策略
function getApplicationReminderStrategy(app, reminderSettings) {
    // 只根据优先级策略确定提醒频率
    let priorityStrategy = null;
    if (app.priority === 'high') {
        priorityStrategy = reminderSettings.priority.high;
    } else if (app.priority === 'medium') {
        priorityStrategy = reminderSettings.priority.medium;
    } else {
        priorityStrategy = reminderSettings.priority.low;
    }

    // 直接返回优先级策略，不再考虑金额因素
    return {
        initialDelay: priorityStrategy.initialDelay,
        normalInterval: priorityStrategy.normalInterval,
        mediumInterval: priorityStrategy.mediumInterval,
        urgentInterval: priorityStrategy.urgentInterval
    };
}

// 发送提醒邮件
function sendReminderEmail(app, users, level, waitingHours) {
    try {
        // 确定收件人
        let recipients = [];

        if (app.status === '待厂长审核') {
            // 获取仍然处于pending状态的厂长
            const pendingDirectors = [];
            if (app.approvals.directors) {
                Object.entries(app.approvals.directors).forEach(([username, approval]) => {
                    if (approval.status === 'pending') {
                        pendingDirectors.push(username);
                    }
                });
            }
            recipients = getUserEmails(pendingDirectors);
        } else if (app.status === '待总监审批') {
            // 获取所有总监
            const chiefs = users.filter(user => user.role === 'chief').map(user => user.username);
            recipients = getUserEmails(chiefs);
        } else if (app.status === '待经理审批') {
            // 获取仍然处于pending状态的经理
            const pendingManagers = [];
            if (app.approvals.managers) {
                Object.entries(app.approvals.managers).forEach(([username, approval]) => {
                    if (approval.status === 'pending') {
                        pendingManagers.push(username);
                    }
                });
            }
            recipients = getUserEmails(pendingManagers);
        } else if (app.status === '待CEO审批') {
            // 获取所有CEO用户
            const ceos = users.filter(user => user.role === 'ceo').map(user => user.username);
            recipients = getUserEmails(ceos);
        }

        if (recipients.length === 0) {
            logWithTime(`申请 ${app.applicationCode} 没有找到有效的待审批人邮箱`);
            return;
        }

        // 生成邮件主题
        let subject = '';
        const waitingDays = Math.floor(waitingHours / 24);

        if (level === 'normal') {
            subject = `【待审批】${app.applicant}的申请等待您审批`;
        } else if (level === 'medium') {
            subject = `【请尽快处理】${app.applicant}的申请已等待超过1天`;
        } else if (level === 'urgent') {
            subject = `【紧急】${app.applicant}的申请已延迟${waitingDays}天，请立即处理`;
        }

        // 生成邮件内容
        const waitingTimeText = waitingDays > 0 ?
            `${waitingDays}天${Math.floor(waitingHours % 24)}小时` :
            `${Math.floor(waitingHours)}小时`;

        const urgencyNote = level === 'urgent' ?
            '<strong style="color: red;">⚠️ 此申请已被标记为紧急，请优先处理！</strong>' : '';

        // 根据申请的审批流程生成更准确的状态描述
        let statusDescription = getEmailStatusDescription(app.status, app);

        const content = generateEmailTemplate({
            title: '申请审批提醒',
            applicant: app.applicant,
            applicationCode: app.applicationCode || '无编号',
            department: app.department,
            date: app.date,
            content: app.content,
            priority: app.priority,
            status: statusDescription,
            actionText: '立即审批',
            actionUrl: SERVER_CONFIG.url,
            urgencyNote: urgencyNote,
            additionalInfo: `<strong>当前层级等待时间:</strong> ${waitingTimeText}`,
            footerNote: `这是第${app.reminderInfo.reminderCount + 1}次提醒邮件`
        });

        // 发送邮件
        sendEmailNotification(recipients, subject, content, app.applicationCode)
            .then(success => {
                if (success) {
                    logWithTime(`提醒邮件发送成功: 申请 ${app.applicationCode}, 级别 ${level}, 收件人 ${recipients.length} 人`);
                } else {
                    logWithTime(`提醒邮件发送失败: 申请 ${app.applicationCode}`);
                }
            });

    } catch (error) {
        errorWithTime('发送提醒邮件出错:', error);
    }
}

// 启动定时提醒任务
function startReminderScheduler() {
    logWithTime('启动申请提醒系统...');

    // 立即执行第一次检查
    logWithTime('开始第一次提醒检查...');
    checkAndSendReminders();

    // 之后每30分钟检查一次
    setInterval(checkAndSendReminders, 30 * 60 * 1000);
    logWithTime('定期提醒任务已启动，每30分钟检查一次');
}

// 获取提醒设置API
app.get('/getReminderSettings', (req, res) => {
    const { username } = req.query;
    const users = getUsers();

    // 检查权限
    const user = users.find(u => u.username === username);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ success: false, message: '权限不足，只有管理员可以查看提醒设置' });
    }

    try {
        const settings = getReminderSettings();
        res.json({ success: true, settings });
    } catch (error) {
        console.error('获取提醒设置失败:', error);
        res.status(500).json({ success: false, message: '获取提醒设置失败' });
    }
});



// 保存提醒策略API
app.post('/saveReminderStrategies', (req, res) => {
    const { username, strategies } = req.body;
    const users = getUsers();

    // 检查权限
    const user = users.find(u => u.username === username);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ success: false, message: '权限不足，只有管理员可以修改提醒策略' });
    }

    try {
        // 验证策略数据
        if (!strategies || typeof strategies !== 'object') {
            return res.status(400).json({ success: false, message: '无效的策略数据' });
        }

        // 获取当前设置
        const currentSettings = getReminderSettings();

        // 更新优先级策略
        if (strategies.priority) {
            ['high', 'medium', 'low'].forEach(priority => {
                if (strategies.priority[priority]) {
                    const p = strategies.priority[priority];
                    currentSettings.priority[priority] = {
                        initialDelay: Math.max(1, parseInt(p.initialDelay) || 8),
                        normalInterval: Math.max(1, parseInt(p.normalInterval) || 8),
                        mediumInterval: Math.max(1, parseInt(p.mediumInterval) || 4),
                        urgentInterval: Math.max(1, parseInt(p.urgentInterval) || 2)
                    };
                }
            });
        }

        // 更新时间控制设置
        if (strategies.timeControl) {
            currentSettings.timeControl = currentSettings.timeControl || {};

            // 工作日设置
            if (strategies.timeControl.workingDays) {
                currentSettings.timeControl.workingDays = {
                    enabled: Boolean(strategies.timeControl.workingDays.enabled),
                    days: Array.isArray(strategies.timeControl.workingDays.days) ?
                          strategies.timeControl.workingDays.days.filter(d => d >= 1 && d <= 7) :
                          [1, 2, 3, 4, 5],
                    startTime: strategies.timeControl.workingDays.startTime || '09:00',
                    endTime: strategies.timeControl.workingDays.endTime || '18:00'
                };
            }

            // 自定义日期设置
            if (strategies.timeControl.customDates) {
                currentSettings.timeControl.customDates = {
                    enabled: Boolean(strategies.timeControl.customDates.enabled),
                    skipDates: Array.isArray(strategies.timeControl.customDates.skipDates) ?
                              strategies.timeControl.customDates.skipDates :
                              []
                };
            }
        }

        // 保存设置
        if (saveReminderSettings(currentSettings)) {
            logWithTime(`管理员 ${username} 更新了提醒策略`);

            // 立即应用新的提醒策略，触发一次提醒检查
            logWithTime('立即应用新的提醒策略，触发提醒检查...');
            // 重置静默模式，让下次检查显示详细信息
            silentMode = false;
            // 异步执行提醒检查，避免阻塞响应
            setTimeout(() => {
                checkAndSendReminders();
            }, 100);

            res.json({
                success: true,
                message: '提醒策略保存成功并已立即生效'
            });
        } else {
            res.status(500).json({ success: false, message: '保存策略失败' });
        }
    } catch (error) {
        console.error('保存提醒策略失败:', error);
        res.status(500).json({ success: false, message: '保存策略失败' });
    }
});

// 手动触发提醒检查API
app.post('/triggerReminderCheck', (req, res) => {
    const { username } = req.body;
    const users = getUsers();

    // 检查权限
    const user = users.find(u => u.username === username);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ success: false, message: '权限不足，只有管理员可以触发提醒检查' });
    }

    try {
        logWithTime(`管理员 ${username} 手动触发提醒检查`);
        // 重置静默模式，显示详细检查信息
        silentMode = false;
        // 异步执行提醒检查
        setTimeout(() => {
            checkAndSendReminders();
        }, 100);

        res.json({ success: true, message: '提醒检查已触发，请查看服务器日志了解详细信息' });
    } catch (error) {
        console.error('触发提醒检查失败:', error);
        res.status(500).json({ success: false, message: '触发提醒检查失败' });
    }
});

// 获取申请金额统计API
app.get('/getApplicationStats', (req, res) => {
    const { username } = req.query;
    const users = getUsers();

    // 检查用户是否存在
    const user = users.find(u => u.username === username);
    if (!user) {
        return res.status(403).json({ success: false, message: '用户不存在' });
    }

    try {
        const applications = getAllApplications({ includeAll: true }); // 包含归档数据

        // 根据用户角色筛选可见的申请
        let filteredApps = [];
        if (user.role === 'admin' || user.role === 'readonly') {
            // 管理员和只读用户可以看到所有申请
            filteredApps = applications;
        } else {
            // 其他用户只能看到自己提交的申请
            filteredApps = applications.filter(app => app.username === username);
        }

        // 初始化统计数据
        const stats = {
            total: {
                cny: 0,
                usd: 0
            },
            pending: {
                cny: 0,
                usd: 0
            },
            approved: {
                cny: 0,
                usd: 0
            },
            count: {
                total: filteredApps.length,
                pending: 0,
                approved: 0
            }
        };

        // 统计各状态的申请金额
        filteredApps.forEach(app => {
            const amount = parseFloat(app.amount) || 0;
            const currency = app.currency || 'CNY';

            // 累加总金额
            if (currency === 'USD') {
                stats.total.usd += amount;
            } else {
                stats.total.cny += amount;
            }

            // 根据状态累加金额
            if (app.status === '已通过') {
                stats.count.approved++;
                if (currency === 'USD') {
                    stats.approved.usd += amount;
                } else {
                    stats.approved.cny += amount;
                }
            } else if (app.status === '待厂长审核' || app.status === '待总监审批' ||
                       app.status === '待经理审批' || app.status === '待CEO审批') {
                stats.count.pending++;
                if (currency === 'USD') {
                    stats.pending.usd += amount;
                } else {
                    stats.pending.cny += amount;
                }
            }
        });

        res.json({ success: true, stats });
    } catch (error) {
        console.error('获取申请统计失败:', error);
        res.status(500).json({ success: false, message: '获取统计信息失败' });
    }
});

// 获取提醒统计API
app.get('/getReminderStats', (req, res) => {
    const { username } = req.query;
    const users = getUsers();

    // 检查权限
    const user = users.find(u => u.username === username);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ success: false, message: '权限不足，只有管理员可以查看统计信息' });
    }

    try {
        const applications = getApplications();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // 计算统计数据
        const stats = {
            totalReminders: 0,
            pendingApplications: 0,
            urgentApplications: 0,
            avgResponseTime: 0
        };

        // 统计待审批申请
        const pendingApps = applications.filter(app =>
            app.status === '待厂长审核' ||
            app.status === '待总监审批' ||
            app.status === '待经理审批' ||
            app.status === '待CEO审批'
        );

        stats.pendingApplications = pendingApps.length;

        // 统计紧急申请（等待超过48小时）
        stats.urgentApplications = pendingApps.filter(app => {
            const submitTime = new Date(app.id);
            const waitingHours = (now - submitTime) / (1000 * 60 * 60);
            return waitingHours >= 48;
        }).length;

        // 统计今日发送的提醒数量
        stats.totalReminders = applications.reduce((count, app) => {
            if (app.reminderInfo && app.reminderInfo.lastReminderTime) {
                const lastReminderTime = new Date(app.reminderInfo.lastReminderTime);
                if (lastReminderTime >= today) {
                    return count + 1;
                }
            }
            return count;
        }, 0);

        // 计算平均响应时间（已完成申请的平均处理时间）
        const completedApps = applications.filter(app =>
            app.status === '已通过' || app.status === '已拒绝'
        );

        if (completedApps.length > 0) {
            const totalResponseTime = completedApps.reduce((total, app) => {
                const submitTime = new Date(app.date);
                // 找到最后一次审批时间
                let lastApprovalTime = submitTime;

                // 检查各个审批阶段的时间
                if (app.approvals) {
                    // 检查厂长审批时间
                    if (app.approvals.directors) {
                        Object.values(app.approvals.directors).forEach(director => {
                            if (director.timestamp) {
                                const approvalTime = new Date(director.timestamp);
                                if (approvalTime > lastApprovalTime) {
                                    lastApprovalTime = approvalTime;
                                }
                            }
                        });
                    }

                    // 检查总监审批时间
                    if (app.approvals.chief && app.approvals.chief.timestamp) {
                        const approvalTime = new Date(app.approvals.chief.timestamp);
                        if (approvalTime > lastApprovalTime) {
                            lastApprovalTime = approvalTime;
                        }
                    }

                    // 检查经理审批时间
                    if (app.approvals.managers) {
                        Object.values(app.approvals.managers).forEach(manager => {
                            if (manager.timestamp) {
                                const approvalTime = new Date(manager.timestamp);
                                if (approvalTime > lastApprovalTime) {
                                    lastApprovalTime = approvalTime;
                                }
                            }
                        });
                    }

                    // 检查CEO审批时间
                    if (app.approvals.ceo && app.approvals.ceo.timestamp) {
                        const approvalTime = new Date(app.approvals.ceo.timestamp);
                        if (approvalTime > lastApprovalTime) {
                            lastApprovalTime = approvalTime;
                        }
                    }
                }

                const responseTime = (lastApprovalTime - submitTime) / (1000 * 60 * 60); // 小时
                return total + responseTime;
            }, 0);

            stats.avgResponseTime = Math.round(totalResponseTime / completedApps.length);
        }

        res.json({ success: true, stats });
    } catch (error) {
        console.error('获取统计信息失败:', error);
        res.status(500).json({ success: false, message: '获取统计信息失败' });
    }
});

// 网络连接状态检测API
app.get('/api/health', (req, res) => {
    const healthCheck = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        server: {
            url: SERVER_CONFIG.url,
            port: port,
            trustProxy: app.get('trust proxy')
        },
        network: {
            clientIP: req.ip,
            forwardedFor: req.headers['x-forwarded-for'],
            realIP: req.headers['x-real-ip'],
            userAgent: req.headers['user-agent']
        }
    };

    res.json(healthCheck);
});

// 辅助函数：检查申请是否需要当前用户角色的审核
function needsApprovalByCurrentUser(status, userRole) {
    // 根据状态判断是否需要审核
    if (status === '已完成' || status.includes('拒绝')) {
        return false; // 已完成或被拒绝的申请不需要审核
    }

    // 根据用户角色判断是否需要审核
    switch (userRole) {
        case 'admin':
        case 'readonly':
            // 管理员和只读用户可以看到所有待审核的申请
            return status.includes('待') && !status.includes('已完成');
        case 'director':
            return status === '待厂长审核';
        case 'chief':
            return status === '待总监审核' || status === '待总监审批';
        case 'manager':
            return status === '待经理审核' || status === '待经理审批';
        case 'ceo':
            return status === '待CEO审核' || status === '待CEO审批';
        default:
            return false;
    }
}

// 数据恢复管理接口（仅管理员可用）
app.post('/admin/recover-applications', (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ success: false, message: '缺少用户名参数' });
    }

    // 验证用户权限
    const users = getUsers();
    const user = users.find(u => u.username === username);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ success: false, message: '权限不足，仅管理员可执行此操作' });
    }

    try {
        const success = recoverApplicationsFromBackup();
        if (success) {
            // 重新读取数据以验证恢复结果
            const applications = getApplications();
            res.json({
                success: true,
                message: '申请数据恢复成功',
                recoveredCount: applications.length,
                applications: applications.map(app => ({
                    id: app.id,
                    applicant: app.applicant,
                    department: app.department,
                    date: app.date,
                    status: app.status,
                    applicationCode: app.applicationCode
                }))
            });
        } else {
            res.status(500).json({ success: false, message: '申请数据恢复失败' });
        }
    } catch (error) {
        console.error('数据恢复接口错误:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// 数据完整性检查接口（仅管理员可用）
app.get('/admin/check-data-integrity', (req, res) => {
    const { username } = req.query;

    if (!username) {
        return res.status(400).json({ success: false, message: '缺少用户名参数' });
    }

    // 验证用户权限
    const users = getUsers();
    const user = users.find(u => u.username === username);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ success: false, message: '权限不足，仅管理员可执行此操作' });
    }

    try {
        const applications = getApplications();
        const isValid = validateApplicationsData(applications);

        // 检查备份文件状态
        const backupPath = `${applicationsFile}.backup`;
        let backupStatus = {
            exists: fs.existsSync(backupPath),
            valid: false,
            count: 0
        };

        if (backupStatus.exists) {
            try {
                const backupData = fs.readFileSync(backupPath, 'utf8');
                const backupApplications = JSON.parse(backupData);
                backupStatus.valid = validateApplicationsData(backupApplications);
                backupStatus.count = backupApplications.length;
            } catch (error) {
                backupStatus.valid = false;
            }
        }

        res.json({
            success: true,
            dataIntegrity: {
                mainFile: {
                    valid: isValid,
                    count: applications.length,
                    path: applicationsFile
                },
                backupFile: backupStatus
            }
        });
    } catch (error) {
        console.error('数据完整性检查错误:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// 手动归档接口（仅管理员可用）
app.post('/admin/archive-old-applications', (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ success: false, message: '缺少用户名参数' });
    }

    // 验证用户权限
    const users = getUsers();
    const user = users.find(u => u.username === username);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ success: false, message: '权限不足，仅管理员可执行此操作' });
    }

    try {
        console.log(`管理员 ${username} 触发手动归档`);
        const result = archiveOldApplications();

        if (result.success) {
            res.json({
                success: true,
                message: `归档完成：已归档${result.archivedCount}个申请，主文件剩余${result.remainingCount}个申请`,
                archivedCount: result.archivedCount,
                remainingCount: result.remainingCount
            });
        } else {
            res.status(500).json({
                success: false,
                message: result.message || '归档失败'
            });
        }
    } catch (error) {
        console.error('手动归档错误:', error);
        res.status(500).json({ success: false, message: '服务器内部错误: ' + error.message });
    }
});

// 获取归档统计信息（仅管理员可用）
app.get('/admin/archive-stats', (req, res) => {
    const { username } = req.query;

    if (!username) {
        return res.status(400).json({ success: false, message: '缺少用户名参数' });
    }

    // 验证用户权限
    const users = getUsers();
    const user = users.find(u => u.username === username);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ success: false, message: '权限不足，仅管理员可执行此操作' });
    }

    try {
        const activeApps = getApplications();
        const archivedApps = loadArchivedApplications({ includeAll: true });

        // 统计活跃数据
        const activeStats = {
            total: activeApps.length,
            pending: activeApps.filter(a => !['已通过', '已拒绝'].includes(a.status)).length,
            completed: activeApps.filter(a => ['已通过', '已拒绝'].includes(a.status)).length
        };

        // 统计归档数据
        const archiveStats = {
            total: archivedApps.length,
            approved: archivedApps.filter(a => a.status === '已通过').length,
            rejected: archivedApps.filter(a => a.status === '已拒绝').length
        };

        // 获取归档文件列表
        const archiveFiles = [];
        if (fs.existsSync(archiveDataDir)) {
            const files = fs.readdirSync(archiveDataDir).filter(f => f.endsWith('.json'));
            files.forEach(file => {
                try {
                    const filePath = path.join(archiveDataDir, file);
                    const stats = fs.statSync(filePath);
                    const data = fs.readFileSync(filePath, 'utf8');
                    const apps = JSON.parse(data);

                    archiveFiles.push({
                        filename: file,
                        count: apps.length,
                        size: (stats.size / 1024).toFixed(2) + ' KB',
                        lastModified: stats.mtime
                    });
                } catch (error) {
                    console.error(`读取归档文件 ${file} 失败:`, error);
                }
            });
        }

        // 计算主文件大小
        const mainFileStats = fs.statSync(applicationsFile);
        const mainFileSizeMB = (mainFileStats.size / (1024 * 1024)).toFixed(2);

        res.json({
            success: true,
            stats: {
                active: activeStats,
                archived: archiveStats,
                mainFileSize: mainFileSizeMB + ' MB',
                archiveFiles: archiveFiles.sort((a, b) => b.filename.localeCompare(a.filename))
            }
        });
    } catch (error) {
        console.error('获取归档统计信息错误:', error);
        res.status(500).json({ success: false, message: '服务器内部错误: ' + error.message });
    }
});


// 启动服务器
app.listen(port, () => {
    logWithTime(`Server running at http://localhost:${port}`);

    // 启动提醒系统
    startReminderScheduler();
});