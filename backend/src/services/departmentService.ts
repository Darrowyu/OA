import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

// 部门数据类型
export interface DepartmentData {
  name: string;
  code: string;
  parentId?: string | null;
  managerId?: string | null;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// 部门树节点类型
export interface DepartmentTreeNode {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  level: number;
  sortOrder: number;
  managerId: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  children: DepartmentTreeNode[];
  manager?: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  userCount: number;
}

// 构建部门树形结构
function buildDepartmentTree(
  departments: Array<{
    id: string;
    name: string;
    code: string;
    parentId: string | null;
    level: number;
    sortOrder: number;
    managerId: string | null;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    manager: { id: string; name: string; email: string | null } | null;
    _count: { users: number };
  }>
): DepartmentTreeNode[] {
  const nodeMap = new Map<string, DepartmentTreeNode>();
  const roots: DepartmentTreeNode[] = [];

  // 先创建所有节点
  departments.forEach(dept => {
    nodeMap.set(dept.id, {
      ...dept,
      children: [],
      userCount: dept._count.users,
    });
  });

  // 构建树形关系
  departments.forEach(dept => {
    const node = nodeMap.get(dept.id)!;
    if (dept.parentId) {
      const parent = nodeMap.get(dept.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        // 父节点不在列表中，作为根节点处理
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  // 对每个节点的子节点按 sortOrder 排序
  const sortTree = (nodes: DepartmentTreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach(node => {
      if (node.children.length > 0) {
        sortTree(node.children);
      }
    });
  };

  sortTree(roots);
  return roots;
}

/**
 * 获取部门树形结构
 */
export async function getDepartmentTree(): Promise<DepartmentTreeNode[]> {
  const departments = await prisma.department.findMany({
    include: {
      manager: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          users: true,
        },
      },
    },
    orderBy: {
      sortOrder: 'asc',
    },
  });

  return buildDepartmentTree(departments);
}

/**
 * 根据ID获取部门详情
 */
export async function getDepartmentById(id: string) {
  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      parent: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      manager: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      children: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      _count: {
        select: {
          users: true,
        },
      },
    },
  });

  if (!department) {
    return null;
  }

  return {
    ...department,
    userCount: department._count.users,
  };
}

/**
 * 计算部门层级
 */
async function calculateLevel(parentId: string | null | undefined): Promise<number> {
  if (!parentId) {
    return 1; // 根部门层级为1
  }

  const parent = await prisma.department.findUnique({
    where: { id: parentId },
    select: { level: true },
  });

  return parent ? parent.level + 1 : 1;
}

/**
 * 创建部门
 */
export async function createDepartment(data: DepartmentData) {
  // 检查部门编码是否已存在
  const existingCode = await prisma.department.findUnique({
    where: { code: data.code },
  });

  if (existingCode) {
    throw new Error('部门编码已存在');
  }

  // 如果指定了父部门，检查是否存在
  if (data.parentId) {
    const parent = await prisma.department.findUnique({
      where: { id: data.parentId },
    });
    if (!parent) {
      throw new Error('父部门不存在');
    }
  }

  // 如果指定了负责人，检查用户是否存在
  if (data.managerId) {
    const manager = await prisma.user.findUnique({
      where: { id: data.managerId },
    });
    if (!manager) {
      throw new Error('负责人不存在');
    }
  }

  // 计算部门层级
  const level = await calculateLevel(data.parentId);

  const department = await prisma.department.create({
    data: {
      name: data.name,
      code: data.code,
      parentId: data.parentId || null,
      level,
      sortOrder: data.sortOrder ?? 0,
      managerId: data.managerId || null,
      description: data.description || null,
      isActive: data.isActive ?? true,
    },
    include: {
      manager: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      parent: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  return department;
}

/**
 * 更新部门
 */
export async function updateDepartment(id: string, data: Partial<DepartmentData>) {
  // 检查部门是否存在
  const existingDept = await prisma.department.findUnique({
    where: { id },
    include: {
      children: {
        select: { id: true },
      },
    },
  });

  if (!existingDept) {
    throw new Error('部门不存在');
  }

  // 如果更新部门编码，检查是否与其他部门冲突
  if (data.code && data.code !== existingDept.code) {
    const codeExists = await prisma.department.findUnique({
      where: { code: data.code },
    });
    if (codeExists) {
      throw new Error('部门编码已存在');
    }
  }

  // 如果更新父部门，检查是否形成循环依赖
  if (data.parentId !== undefined && data.parentId !== existingDept.parentId) {
    if (data.parentId === id) {
      throw new Error('不能将部门设置为自己的父部门');
    }

    if (data.parentId) {
      // 检查新父部门是否存在
      const newParent = await prisma.department.findUnique({
        where: { id: data.parentId },
      });
      if (!newParent) {
        throw new Error('父部门不存在');
      }

      // 检查新父部门是否当前部门的子部门（防止循环依赖）
      const isDescendant = await checkIsDescendant(id, data.parentId);
      if (isDescendant) {
        throw new Error('不能将部门设置为其子部门的子部门');
      }
    }
  }

  // 如果更新负责人，检查用户是否存在
  if (data.managerId !== undefined && data.managerId !== existingDept.managerId) {
    if (data.managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: data.managerId },
      });
      if (!manager) {
        throw new Error('负责人不存在');
      }
    }
  }

  // 计算新的层级
  let newLevel = existingDept.level;
  if (data.parentId !== undefined && data.parentId !== existingDept.parentId) {
    newLevel = await calculateLevel(data.parentId);
  }

  // 使用事务更新部门及其子部门的层级
  const updatedDept = await prisma.$transaction(async (tx) => {
    // 更新当前部门
    const dept = await tx.department.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        parentId: data.parentId,
        level: newLevel,
        sortOrder: data.sortOrder,
        managerId: data.managerId,
        description: data.description,
        isActive: data.isActive,
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // 如果层级发生变化，更新所有子部门的层级
    if (newLevel !== existingDept.level) {
      await updateChildrenLevel(tx, id, newLevel);
    }

    return dept;
  });

  return updatedDept;
}

/**
 * 递归更新子部门层级
 */
async function updateChildrenLevel(
  tx: Prisma.TransactionClient,
  parentId: string,
  parentLevel: number
): Promise<void> {
  const children = await tx.department.findMany({
    where: { parentId },
    select: { id: true },
  });

  for (const child of children) {
    const newLevel = parentLevel + 1;
    await tx.department.update({
      where: { id: child.id },
      data: { level: newLevel },
    });
    await updateChildrenLevel(tx, child.id, newLevel);
  }
}

/**
 * 检查 targetId 是否是 sourceId 的后代部门
 */
async function checkIsDescendant(sourceId: string, targetId: string): Promise<boolean> {
  let currentId: string | null = targetId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === sourceId) {
      return true;
    }

    if (visited.has(currentId)) {
      break; // 防止无限循环
    }
    visited.add(currentId);

    const parent: { parentId: string | null } | null = await prisma.department.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });

    currentId = parent?.parentId || null;
  }

  return false;
}

/**
 * 删除部门
 */
export async function deleteDepartment(id: string): Promise<{ success: boolean; message: string }> {
  // 检查部门是否存在
  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      children: {
        select: { id: true },
      },
      _count: {
        select: {
          users: true,
        },
      },
    },
  });

  if (!department) {
    throw new Error('部门不存在');
  }

  // 检查是否有子部门
  if (department.children.length > 0) {
    throw new Error('该部门存在子部门，无法删除');
  }

  // 检查是否有用户关联
  if (department._count.users > 0) {
    throw new Error('该部门下存在员工，无法删除');
  }

  await prisma.department.delete({
    where: { id },
  });

  return { success: true, message: '部门已删除' };
}

/**
 * 获取部门成员列表
 */
export async function getDepartmentUsers(departmentId: string) {
  // 检查部门是否存在
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
  });

  if (!department) {
    throw new Error('部门不存在');
  }

  const users = await prisma.user.findMany({
    where: { departmentId },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      role: true,
      employeeId: true,
      position: true,
      phone: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return users;
}

/**
 * 移动部门
 */
export async function moveDepartment(id: string, newParentId: string | null) {
  // 检查部门是否存在
  const department = await prisma.department.findUnique({
    where: { id },
  });

  if (!department) {
    throw new Error('部门不存在');
  }

  // 如果要移动到的父部门是当前部门本身
  if (newParentId === id) {
    throw new Error('不能将部门移动到自己下面');
  }

  // 如果要移动到的父部门是当前部门的子部门（防止循环依赖）
  if (newParentId) {
    const isDescendant = await checkIsDescendant(id, newParentId);
    if (isDescendant) {
      throw new Error('不能将部门移动到其子部门下');
    }

    // 检查新父部门是否存在
    const newParent = await prisma.department.findUnique({
      where: { id: newParentId },
    });
    if (!newParent) {
      throw new Error('目标父部门不存在');
    }
  }

  // 计算新的层级
  const newLevel = newParentId ? await calculateLevel(newParentId) + 1 : 1;

  // 使用事务更新
  const updatedDept = await prisma.$transaction(async (tx) => {
    const dept = await tx.department.update({
      where: { id },
      data: {
        parentId: newParentId,
        level: newLevel,
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // 更新所有子部门的层级
    await updateChildrenLevel(tx, id, newLevel);

    return dept;
  });

  return updatedDept;
}

/**
 * 获取所有部门列表（扁平结构，用于下拉选择）
 */
export async function getAllDepartments() {
  const departments = await prisma.department.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      code: true,
      parentId: true,
      level: true,
      sortOrder: true,
    },
    orderBy: [
      { level: 'asc' },
      { sortOrder: 'asc' },
    ],
  });

  return departments;
}
