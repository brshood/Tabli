export function CloudBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large background clouds */}
      <div className="absolute top-10 left-10 w-32 h-20 bg-white/10 rounded-full blur-xl animate-pulse" />
      <div className="absolute top-20 right-20 w-40 h-24 bg-white/15 rounded-full blur-2xl animate-pulse delay-1000" />
      <div className="absolute bottom-32 left-16 w-36 h-22 bg-white/12 rounded-full blur-xl animate-pulse delay-2000" />
      <div className="absolute bottom-20 right-12 w-28 h-18 bg-white/8 rounded-full blur-xl animate-pulse delay-3000" />
      
      {/* Medium clouds */}
      <div className="absolute top-1/3 left-1/4 w-24 h-16 bg-white/20 rounded-full blur-lg animate-pulse delay-500" />
      <div className="absolute top-1/2 right-1/3 w-20 h-12 bg-white/25 rounded-full blur-lg animate-pulse delay-1500" />
      <div className="absolute bottom-1/3 left-1/3 w-32 h-20 bg-white/15 rounded-full blur-lg animate-pulse delay-2500" />
      
      {/* Small detail clouds */}
      <div className="absolute top-1/4 right-1/4 w-16 h-10 bg-white/30 rounded-full blur-md animate-pulse delay-750" />
      <div className="absolute top-3/4 left-1/2 w-12 h-8 bg-white/35 rounded-full blur-md animate-pulse delay-1750" />
      <div className="absolute top-1/2 left-1/6 w-14 h-9 bg-white/28 rounded-full blur-md animate-pulse delay-2750" />
      
      {/* Floating cloud shapes */}
      <svg className="absolute top-16 left-1/2 w-24 h-16 text-white/10" viewBox="0 0 24 16" fill="currentColor">
        <path d="M6 12c-2.21 0-4-1.79-4-4 0-2.21 1.79-4 4-4 .42 0 .82.07 1.2.2C8.12 2.88 9.88 2 12 2s3.88.88 4.8 2.2c.38-.13.78-.2 1.2-.2 2.21 0 4 1.79 4 4 0 2.21-1.79 4-4 4H6z"/>
      </svg>
      
      <svg className="absolute bottom-24 right-1/4 w-20 h-12 text-white/15" viewBox="0 0 24 16" fill="currentColor">
        <path d="M6 12c-2.21 0-4-1.79-4-4 0-2.21 1.79-4 4-4 .42 0 .82.07 1.2.2C8.12 2.88 9.88 2 12 2s3.88.88 4.8 2.2c.38-.13.78-.2 1.2-.2 2.21 0 4 1.79 4 4 0 2.21-1.79 4-4 4H6z"/>
      </svg>
      
      <svg className="absolute top-2/3 left-1/5 w-16 h-10 text-white/20" viewBox="0 0 24 16" fill="currentColor">
        <path d="M6 12c-2.21 0-4-1.79-4-4 0-2.21 1.79-4 4-4 .42 0 .82.07 1.2.2C8.12 2.88 9.88 2 12 2s3.88.88 4.8 2.2c.38-.13.78-.2 1.2-.2 2.21 0 4 1.79 4 4 0 2.21-1.79 4-4 4H6z"/>
      </svg>
    </div>
  );
}