export default function AvatrLogo({ 
  className = "w-8 h-8", 
  light = false 
}: { 
  className?: string; 
  light?: boolean;
}) {
  return (
    <div className={`relative flex items-center justify-center overflow-hidden rounded-lg ${className}`}>
      <img
        src="/avatr-logo.png"
        alt="AVATR Official Logo"
        className={`w-full h-full object-contain transform transition-all duration-300 hover:scale-105 ${light ? 'brightness-0' : ''}`}
      />
    </div>
  );
}
