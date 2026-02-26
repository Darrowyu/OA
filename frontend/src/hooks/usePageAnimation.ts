import { Variants } from 'framer-motion';

// 默认动画配置常量
const DEFAULT_STAGGER_CHILDREN = 0.05;
const DEFAULT_DELAY_CHILDREN = 0.1;
const DEFAULT_DURATION = 0.3;
const DEFAULT_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const DEFAULT_ITEM_Y_OFFSET = 20;

// 容器动画变体配置选项
export interface ContainerVariantsOptions {
  /** 子元素动画间隔时间（秒），默认 0.05 */
  staggerChildren?: number;
  /** 延迟开始动画时间（秒），默认 0.1 */
  delayChildren?: number;
}

// 子元素动画变体配置选项
export interface ItemVariantsOptions {
  /** 动画持续时间（秒），默认 0.3 */
  duration?: number;
  /** 缓动函数，默认 [0.22, 1, 0.36, 1] */
  ease?: [number, number, number, number];
  /** Y轴初始偏移量（像素），默认 20 */
  yOffset?: number;
}

// 完整动画配置选项
export interface PageAnimationOptions {
  container?: ContainerVariantsOptions;
  item?: ItemVariantsOptions;
}

/**
 * 创建容器动画变体
 * 用于包裹多个子元素，实现错开动画效果
 */
export function createContainerVariants(
  options: ContainerVariantsOptions = {}
): Variants {
  const {
    staggerChildren = DEFAULT_STAGGER_CHILDREN,
    delayChildren = DEFAULT_DELAY_CHILDREN,
  } = options;

  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren,
        delayChildren,
      },
    },
  };
}

/**
 * 创建子元素动画变体
 * 用于单个元素的淡入上移动画
 */
export function createItemVariants(
  options: ItemVariantsOptions = {}
): Variants {
  const {
    duration = DEFAULT_DURATION,
    ease = DEFAULT_EASE,
    yOffset = DEFAULT_ITEM_Y_OFFSET,
  } = options;

  return {
    hidden: { opacity: 0, y: yOffset },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration,
        ease,
      },
    },
  };
}

/**
 * 页面动画Hook
 * 提供统一的页面进入动画配置
 *
 * @example
 * // 基础用法
 * const { containerVariants, itemVariants } = usePageAnimation();
 *
 * // 自定义参数
 * const { containerVariants, itemVariants } = usePageAnimation({
 *   container: { staggerChildren: 0.1, delayChildren: 0.2 },
 *   item: { duration: 0.4, yOffset: 30 },
 * });
 *
 * // 在组件中使用
 * <motion.div variants={containerVariants} initial="hidden" animate="visible">
 *   <motion.div variants={itemVariants}>内容1</motion.div>
 *   <motion.div variants={itemVariants}>内容2</motion.div>
 * </motion.div>
 */
export function usePageAnimation(
  options: PageAnimationOptions = {}
): {
  containerVariants: Variants;
  itemVariants: Variants;
} {
  const containerVariants = createContainerVariants(options.container);
  const itemVariants = createItemVariants(options.item);

  return {
    containerVariants,
    itemVariants,
  };
}

// 默认导出
export default usePageAnimation;

// 预定义的默认动画变体（与Dashboard页面一致）
export const containerVariants: Variants = createContainerVariants({
  staggerChildren: DEFAULT_STAGGER_CHILDREN,
  delayChildren: DEFAULT_DELAY_CHILDREN,
});

export const itemVariants: Variants = createItemVariants({
  duration: DEFAULT_DURATION,
  ease: DEFAULT_EASE,
  yOffset: DEFAULT_ITEM_Y_OFFSET,
});
