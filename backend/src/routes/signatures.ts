import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @route   GET /api/signatures
 * @desc    获取所有用户签名列表
 * @access  Private
 */
router.get('/', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        department: true,
        employeeId: true,
        signature: true,
      },
      orderBy: { name: 'asc' },
    });

    // 只返回签名信息，不包含敏感数据
    const signatures = users.map(user => ({
      username: user.username,
      name: user.name,
      role: user.role,
      department: user.department,
      employeeId: user.employeeId,
      hasSignature: !!user.signature,
      signature: user.signature,
    }));

    res.json({
      success: true,
      data: signatures,
    });
  } catch (error) {
    console.error('获取签名列表失败:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取签名列表失败',
      },
    });
  }
});

/**
 * @route   GET /api/signatures/:username
 * @desc    获取单个用户签名
 * @access  Private
 */
router.get('/:username', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        signature: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: '用户不存在',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        username: user.username,
        name: user.name,
        signature: user.signature,
      },
    });
  } catch (error) {
    console.error('获取用户签名失败:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取用户签名失败',
      },
    });
  }
});

/**
 * @route   POST /api/signatures/batch
 * @desc    批量获取用户签名
 * @access  Private
 */
router.post('/batch', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { usernames } = req.body;

    if (!Array.isArray(usernames) || usernames.length === 0) {
      res.json({
        success: true,
        data: {},
      });
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        username: {
          in: usernames,
        },
      },
      select: {
        username: true,
        signature: true,
      },
    });

    const signatures: Record<string, string | null> = {};
    usernames.forEach((username: string) => {
      const user = users.find(u => u.username === username);
      signatures[username] = user?.signature || null;
    });

    res.json({
      success: true,
      data: signatures,
    });
  } catch (error) {
    console.error('批量获取签名失败:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '批量获取签名失败',
      },
    });
  }
});

/**
 * @route   PUT /api/signatures/:username
 * @desc    更新用户签名（管理员或本人）
 * @access  Private
 */
router.put('/:username', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const { signature } = req.body;
    const currentUser = req.user;

    if (!currentUser) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '请先登录',
        },
      });
      return;
    }

    // 检查权限：只有管理员或本人可以修改签名
    if (currentUser.role !== UserRole.ADMIN && currentUser.username !== username) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '无权修改此用户签名',
        },
      });
      return;
    }

    // 验证签名数据（Base64图片）
    if (signature && !signature.startsWith('data:image')) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: '无效的签名数据，必须是Base64图片格式',
        },
      });
      return;
    }

    const user = await prisma.user.update({
      where: { username },
      data: { signature: signature || null },
      select: {
        id: true,
        username: true,
        name: true,
        signature: true,
      },
    });

    res.json({
      success: true,
      message: '签名更新成功',
      data: {
        username: user.username,
        name: user.name,
        signature: user.signature,
      },
    });
  } catch (error) {
    console.error('更新签名失败:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '更新签名失败',
      },
    });
  }
});

/**
 * @route   DELETE /api/signatures/:username
 * @desc    删除用户签名（管理员或本人）
 * @access  Private
 */
router.delete('/:username', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const currentUser = req.user;

    if (!currentUser) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '请先登录',
        },
      });
      return;
    }

    // 检查权限
    if (currentUser.role !== UserRole.ADMIN && currentUser.username !== username) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '无权删除此用户签名',
        },
      });
      return;
    }

    await prisma.user.update({
      where: { username },
      data: { signature: null },
    });

    res.json({
      success: true,
      message: '签名删除成功',
    });
  } catch (error) {
    console.error('删除签名失败:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '删除签名失败',
      },
    });
  }
});

export default router;
