import { motion } from 'framer-motion';

const variants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0  },
  exit:    { opacity: 0, y: -12 },
};

const transition = { duration: 0.32, ease: [0.4, 0, 0.2, 1] };

export default function AnimatedPage({ children, pageKey }) {
  return (
    <motion.div
      key={pageKey}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}
      style={{ width: '100%' }}
    >
      {children}
    </motion.div>
  );
}

// Staggered container for lists / grids
export function StaggerContainer({ children, className, style }) {
  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
    >
      {children}
    </motion.div>
  );
}

// Each item inside a StaggerContainer
export function StaggerItem({ children, className, style }) {
  return (
    <motion.div
      className={className}
      style={style}
      variants={{
        hidden:  { opacity: 0, y: 18 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
      }}
    >
      {children}
    </motion.div>
  );
}

// Table row animation
export function AnimatedRow({ children, index, ...props }) {
  return (
    <motion.tr
      {...props}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0  }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: 'easeOut' }}
    >
      {children}
    </motion.tr>
  );
}

// Animated button wrapper
export function MotionButton({ children, onClick, className, style, disabled, type }) {
  return (
    <motion.button
      type={type || 'button'}
      className={className}
      style={style}
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.04 } : {}}
      whileTap={!disabled  ? { scale: 0.97 } : {}}
      transition={{ duration: 0.12 }}
    >
      {children}
    </motion.button>
  );
}

// Modal wrapper with scale + blur backdrop
export function AnimatedModal({ children, onClose }) {
  return (
    <motion.div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      {/* Backdrop */}
      <motion.div
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(26,26,46,.45)',
          backdropFilter: 'blur(6px)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      {/* Panel */}
      <motion.div
        style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 620 }}
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1,    opacity: 1, y: 0  }}
        exit={{    scale: 0.95, opacity: 0, y: 8  }}
        transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
