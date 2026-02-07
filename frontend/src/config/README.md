# 前端配置文件说明

## 配置文件

### 环境变量文件 (.env)

在 `frontend` 目录创建 `.env` 文件，参考 `.env.example` 配置。

### 端口配置

| 服务 | 端口 | 配置项 | 说明 |
|------|------|--------|------|
| 开发服务器 | 5173 | Vite默认 | 前端开发服务器端口 |
| API代理 | 3001 | `VITE_API_BASE_URL` | 后端API地址 |

### 关键配置项

```env
# API配置
VITE_API_BASE_URL=http://localhost:3001/api
VITE_UPLOAD_URL=http://localhost:3001/uploads

# 应用配置
VITE_APP_NAME=OA系统
VITE_APP_VERSION=2.0.0
```

### Vite代理配置

开发环境下，Vite 自动代理以下路径到后端：
- `/api/*` → `http://localhost:3001/*`
- `/uploads/*` → `http://localhost:3001/uploads/*`

## 使用方式

```typescript
import config from '@/config';

// 访问配置
const apiUrl = config.API.baseURL;
const appName = config.APP.name;
```
