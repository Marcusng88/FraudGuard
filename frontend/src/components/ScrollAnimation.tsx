import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

interface ScrollAnimationProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade' | 'scale';
  duration?: number;
  distance?: number;
  threshold?: number;
  triggerOnce?: boolean;
}

export function ScrollAnimation({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  duration = 0.6,
  distance = 50,
  threshold = 0.1,
  triggerOnce = true
}: ScrollAnimationProps) {
  const [ref, inView] = useInView({
    threshold,
    triggerOnce,
  });

  const getInitialState = () => {
    switch (direction) {
      case 'up':
        return { opacity: 0, y: distance };
      case 'down':
        return { opacity: 0, y: -distance };
      case 'left':
        return { opacity: 0, x: distance };
      case 'right':
        return { opacity: 0, x: -distance };
      case 'scale':
        return { opacity: 0, scale: 0.8 };
      case 'fade':
      default:
        return { opacity: 0 };
    }
  };

  const getAnimateState = () => {
    switch (direction) {
      case 'up':
      case 'down':
        return { opacity: 1, y: 0 };
      case 'left':
      case 'right':
        return { opacity: 1, x: 0 };
      case 'scale':
        return { opacity: 1, scale: 1 };
      case 'fade':
      default:
        return { opacity: 1 };
    }
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={getInitialState()}
      animate={inView ? getAnimateState() : getInitialState()}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94], // Enhanced easing for smoother animation
        type: "spring",
        stiffness: 100,
        damping: 15,
      }}
    >
      {children}
    </motion.div>
  );
}

// Staggered children animation for lists/grids
interface StaggeredAnimationProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade' | 'scale';
  threshold?: number;
}

export function StaggeredAnimation({
  children,
  className = '',
  staggerDelay = 0.1,
  direction = 'up',
  threshold = 0.1
}: StaggeredAnimationProps) {
  const [ref, inView] = useInView({
    threshold,
    triggerOnce: true,
  });

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };

  const itemVariants = {
    hidden: (() => {
      switch (direction) {
        case 'up':
          return { opacity: 0, y: 50 };
        case 'down':
          return { opacity: 0, y: -50 };
        case 'left':
          return { opacity: 0, x: 50 };
        case 'right':
          return { opacity: 0, x: -50 };
        case 'scale':
          return { opacity: 0, scale: 0.8 };
        case 'fade':
        default:
          return { opacity: 0 };
      }
    })(),
    visible: (() => {
      switch (direction) {
        case 'up':
        case 'down':
          return { opacity: 1, y: 0 };
        case 'left':
        case 'right':
          return { opacity: 1, x: 0 };
        case 'scale':
          return { opacity: 1, scale: 1 };
        case 'fade':
        default:
          return { opacity: 1 };
      }
    })(),
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={itemVariants}
          transition={{
            duration: 0.8,
            ease: [0.25, 0.46, 0.45, 0.94],
            type: "spring",
            stiffness: 120,
            damping: 20,
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

// Parallax effect component
interface ParallaxProps {
  children: React.ReactNode;
  className?: string;
  speed?: number;
}

export function Parallax({ children, className = '', speed = 0.5 }: ParallaxProps) {
  const [ref, inView] = useInView({
    threshold: 0,
    triggerOnce: false,
  });

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        y: inView ? 0 : speed * 100,
      }}
      transition={{
        type: "spring",
        stiffness: 100,
        damping: 30,
      }}
    >
      {children}
    </motion.div>
  );
}
