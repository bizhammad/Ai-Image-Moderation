export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-100 mt-16 py-6">
      <p className="text-center text-[11px] font-light text-slate-400 tracking-wide">
        © {new Date().getFullYear()} AI Content Moderation Platform. All rights reserved.
      </p>
    </footer>
  );
}