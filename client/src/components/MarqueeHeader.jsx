export default function MarqueeHeader() {
  const text = 'AI-POWERED CONTENT MODERATION · SAFER COMMUNITIES BY DESIGN · AUTOMATED DETECTION · HUMAN OVERSIGHT · TRUST AT SCALE';
  const repeated = Array(8).fill(text).join('   •   ');

  return (
    <div className="w-full bg-slate-900 overflow-hidden py-2">
      <div className="flex whitespace-nowrap animate-marquee">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-white/80 pr-4">
          {repeated}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-white/80 pr-4">
          {repeated}
        </span>
      </div>
    </div>
  );
}