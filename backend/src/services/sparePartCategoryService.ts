import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const sparePartCategoryService = {
  async findAll() {
    return prisma.sparePartCategory.findMany({
      include: {
        children: true,
        _count: { select: { parts: true } }
      },
      orderBy: { sortOrder: 'asc' }
    });
  },

  async findTree() {
    const categories = await prisma.sparePartCategory.findMany({
      include: {
        _count: { select: { parts: true } }
      },
      orderBy: { sortOrder: 'asc' }
    });

    // 构建树形结构
    const buildTree = (parentId: string | null): any[] => {
      return categories
        .filter(c => c.parentId === parentId)
        .map(c => ({
          ...c,
          children: buildTree(c.id)
        }));
    };

    return buildTree(null);
  },

  async create(data: { name: string; parentId?: string; description?: string; sortOrder?: number }) {
    return prisma.sparePartCategory.create({ data });
  },

  async update(id: string, data: { name?: string; parentId?: string; description?: string; sortOrder?: number }) {
    // 检查是否将自己设为父级
    if (data.parentId === id) {
      throw new Error('不能将分类设置为自己的子分类');
    }

    // 检查父级是否为自己的子级（避免循环引用）
    if (data.parentId) {
      const children = await this.getAllChildren(id);
      if (children.includes(data.parentId)) {
        throw new Error('不能将分类设置为自己的后代分类');
      }
    }

    return prisma.sparePartCategory.update({
      where: { id },
      data
    });
  },

  async delete(id: string) {
    // 检查是否有子分类
    const children = await prisma.sparePartCategory.count({
      where: { parentId: id }
    });
    if (children > 0) throw new Error('该分类下还有子分类，无法删除');

    // 检查是否有关联配件
    const parts = await prisma.part.count({
      where: { categoryId: id }
    });
    if (parts > 0) throw new Error('该分类下还有配件，无法删除');

    return prisma.sparePartCategory.delete({ where: { id } });
  },

  // 获取所有子分类ID（包括间接子级）
  async getAllChildren(parentId: string): Promise<string[]> {
    const directChildren = await prisma.sparePartCategory.findMany({
      where: { parentId },
      select: { id: true }
    });

    const childIds = directChildren.map(c => c.id);
    const indirectChildren = await Promise.all(
      childIds.map(id => this.getAllChildren(id))
    );

    return [...childIds, ...indirectChildren.flat()];
  }
};
