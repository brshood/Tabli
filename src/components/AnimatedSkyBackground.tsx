import { motion } from 'motion/react';
import skyBackground from 'figma:asset/861a8d3107e6d7e97228e8e59203c104b4fe53d5.png';

export function AnimatedSkyBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Main background layer */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${skyBackground})`,
          scale: 1.1, // Slightly larger to prevent gaps during animation
        }}
        animate={{
          x: [-20, 20, -20],
          y: [-10, 10, -10],
        }}
        transition={{
          duration: 48,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Secondary layer for depth */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
        style={{
          backgroundImage: `url(${skyBackground})`,
          scale: 1.2,
        }}
        animate={{
          x: [30, -30, 30],
          y: [15, -15, 15],
        }}
        transition={{
          duration: 64,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Third layer for even more depth */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
        style={{
          backgroundImage: `url(${skyBackground})`,
          scale: 1.15,
        }}
        animate={{
          x: [-40, 40, -40],
          y: [-20, 20, -20],
        }}
        transition={{
          duration: 80,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Subtle warm overlay to ensure content readability */}
      <div className="absolute inset-0" style={{background: 'rgba(248, 241, 193, 0.25)'}} />
    </div>
  );
}