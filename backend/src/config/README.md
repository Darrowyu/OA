# 后端配置文件说明

## 配置文件

### 环境变量文件 (.env)

在项目根目录创建 `.env` 文件，参考 `.env.example` 配置。

### 端口配置

| 服务 | 端口 | 配置项 | 说明 |
|------|------|--------|------|
| API服务 | 3001 | `PORT` | Express服务器端口 |

### 关键配置项

```env
# 服务器配置
NODE_ENV=development    # 环境: development/production
PORT=3001              # 后端服务端口

# 数据库配置
DATABASE_URL="postgresql://用户名:密码@localhost:5432/数据库名?schema=public"

# JWT配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# CORS配置（前端地址）
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

## 使用方式

```typescript
import { config } from './config';

// 访问配置
const port = config.port;           // 3001
const dbUrl = config.database.url;  // 数据库连接字符串
```
