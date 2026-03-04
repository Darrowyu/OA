import { PrismaClient, Factory } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateFactoryInput {
  name: string;
  code?: string;
  address?: string;
  manager?: string;
  contactPhone?: string;
}

export interface UpdateFactoryInput {
  name?: string;
  code?: string;
  address?: string;
  manager?: string;
  contactPhone?: string;
  status?: string;
}

export const factoryService = {
  async findAll(): Promise<Factory[]> {
    return prisma.factory.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' }
    });
  },

  async findById(id: string): Promise<Factory | null> {
    return prisma.factory.findUnique({ where: { id } });
  },

  async create(data: CreateFactoryInput): Promise<Factory> {
    return prisma.factory.create({ data });
  },

  async update(id: string, data: UpdateFactoryInput): Promise<Factory> {
    return prisma.factory.update({
      where: { id },
      data: { ...data, updatedAt: new Date() }
    });
  },

  async delete(id: string): Promise<Factory> {
    // 检查是否有关联设备
    const equipmentCount = await prisma.equipment.count({
      where: { factoryId: id }
    });

    if (equipmentCount > 0) {
      throw new Error('该厂区下还有设备，无法删除');
    }

    return prisma.factory.update({
      where: { id },
      data: { status: 'inactive', updatedAt: new Date() }
    });
  }
};
