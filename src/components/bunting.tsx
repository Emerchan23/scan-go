export function Bunting({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`bunting ${className}`} />;
}
