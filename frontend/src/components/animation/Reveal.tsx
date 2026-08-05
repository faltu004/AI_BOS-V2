import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const variants: Variants = {
 hidden: { opacity: 0, y: 28 },
 visible: { opacity: 1, y: 0 },
};

type RevealProps = {
 children: ReactNode;
 className?: string;
 delay?: number;
};

export function Reveal({ children, className, delay = 0 }: RevealProps) {
 return (
 <motion.div
 className={className}
 initial="hidden"
 transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
 variants={variants}
 viewport={{ once: true, amount: 0.22 }}
 whileInView="visible"
 >
 {children}
 </motion.div>
 );
}
