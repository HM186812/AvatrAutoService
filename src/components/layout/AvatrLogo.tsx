export default function AvatrLogo({ 
  className = "w-8 h-8", 
  light = false,
  variant = "default",
}: { 
  className?: string; 
  light?: boolean;
  variant?: "default" | "document";
}) {
  if (variant === "document") {
    return (
      <div
        className={`relative flex items-center justify-center bg-transparent border-0 shrink-0 ${className}`}
        style={{ width: '3cm', height: '4cm', backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}
      >
        <img
          src="/avatr-logo-doc.png"
          alt="AVATR Official Logo"
          width="120"
          height="150"
          decoding="async"
          className="w-full h-full object-contain select-none bg-transparent border-0"
          style={{ backgroundColor: 'transparent', border: 'none' }}
        />
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center overflow-hidden rounded-lg ${className}`}>
      <img
        src="/avatr-logo.png"
        alt="AVATR Official Logo"
        width="32"
        height="32"
        decoding="async"
        className={`w-full h-full object-contain transform transition-all duration-300 hover:scale-105 ${light ? 'brightness-0' : ''}`}
      />
    </div>
  );
}
