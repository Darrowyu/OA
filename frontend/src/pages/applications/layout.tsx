import { Outlet } from "react-router-dom"
import { useEffect } from "react"
import { motion } from "framer-motion"
import { Header } from "@/components/Header"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

export { containerVariants, itemVariants }

export function ApplicationsLayout() {
  useEffect(() => {
    // 可以在这里获取审批数量
  }, [])

  return (
    <div className="min-h-screen">
      <Header />
      <motion.main
        className="p-4 md:p-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <Outlet />
        </motion.div>
      </motion.main>
    </div>
  )
}
