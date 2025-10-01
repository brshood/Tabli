import { motion } from 'motion/react';

interface WaveBackgroundProps {
  className?: string;
}

export function WaveBackground({ className = "" }: WaveBackgroundProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} style={{ willChange: 'auto' }}>
      {/* Base background */}
      <div className="absolute inset-0" style={{ backgroundColor: '#F8F1C1' }} />
      
      {/* Main Wave Layer - Large Bottom Wave (Orange Rufous) */}
      <div className="absolute bottom-0 w-full h-full">
        <motion.svg
          className="absolute bottom-0"
          width="200%"
          height="100%"
          viewBox="0 0 2400 600"
          preserveAspectRatio="none"
          style={{ willChange: 'transform' }}
          animate={{ 
            x: ["-50%", "0%"]
          }}
          transition={{
            duration: 60, // Slower but reasonable - 1 minute per cycle
            repeat: Infinity,
            ease: "linear",
            repeatType: "loop"
          }}
        >
          <path
            d="M0,300 C300,450 600,150 900,300 C1200,450 1500,150 1800,300 C2100,450 2400,150 2400,300 L2400,600 L0,600 Z"
            fill="#B7410E"
            opacity="0.25"
          />
        </motion.svg>
      </div>

      {/* Secondary Wave Layer - Medium Wave (Lighter Orange) */}
      <div className="absolute bottom-0 w-full h-full">
        <motion.svg
          className="absolute bottom-0"
          width="200%"
          height="80%"
          viewBox="0 0 2400 480"
          preserveAspectRatio="none"
          animate={{ 
            x: ["0%", "-50%"]
          }}
          transition={{
            duration: 45, // Counter-movement
            repeat: Infinity,
            ease: "linear",
            repeatType: "loop"
          }}
        >
          <path
            d="M0,240 C300,360 600,120 900,240 C1200,360 1500,120 1800,240 C2100,360 2400,120 2400,240 L2400,480 L0,480 Z"
            fill="#D4621A"
            opacity="0.18"
          />
        </motion.svg>
      </div>

      {/* Top Wave Layer - Surface Wave (Ivory Buff) */}
      <div className="absolute bottom-0 w-full h-full">
        <motion.svg
          className="absolute bottom-0"
          width="200%"
          height="60%"
          viewBox="0 0 2400 360"
          preserveAspectRatio="none"
          animate={{ 
            x: ["-50%", "0%"]
          }}
          transition={{
            duration: 75, // Different speed for layering
            repeat: Infinity,
            ease: "linear",
            repeatType: "loop"
          }}
        >
          <path
            d="M0,180 C300,270 600,90 900,180 C1200,270 1500,90 1800,180 C2100,270 2400,90 2400,180 L2400,360 L0,360 Z"
            fill="#F3E5AB"
            opacity="0.35"
          />
        </motion.svg>
      </div>

      {/* Subtle Floating Wave Line */}
      <div className="absolute top-1/4 w-full h-16">
        <motion.svg
          width="200%"
          height="100%"
          viewBox="0 0 2400 60"
          className="opacity-15"
          animate={{ 
            x: ["-50%", "0%"]
          }}
          transition={{
            duration: 90, // Slow floating line
            repeat: Infinity,
            ease: "linear",
            repeatType: "loop"
          }}
        >
          <path
            d="M0,30 Q300,15 600,30 T1200,30 Q1500,15 1800,30 T2400,30"
            stroke="#B7410E"
            strokeWidth="3"
            fill="none"
          />
        </motion.svg>
      </div>

      {/* Gentle Floating Particles - Reduced */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: i % 3 === 0 ? '#B7410E' : i % 3 === 1 ? '#3C3C3C' : '#D4621A',
            left: `${(i * 15) + 10}%`,
            top: `${(i * 10) + 20}%`,
            opacity: 0.4
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.sin(i * 0.5) * 10, 0],
            opacity: [0.4, 0.7, 0.4]
          }}
          transition={{
            duration: 6 + (i * 0.5), // Reasonable particle speed
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.8
          }}
        />
      ))}
    </div>
  );
}