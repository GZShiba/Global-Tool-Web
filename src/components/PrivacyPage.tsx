import { ShieldCheck, Smartphone, HardDrive, Cookie, Mail } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-6">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-soft text-accent font-bold uppercase tracking-[0.22em] text-[10px] mb-4">
          <ShieldCheck size={12} /> Privacy
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-secondary text-sm sm:text-base font-normal leading-relaxed mt-3">
          This policy explains how ToolNest handles data. It is intentionally short because the product is intentionally local.
        </p>

        <div className="mt-8 space-y-5">
          <section className="bg-card border border-subtle rounded-2xl p-5 sm:p-6">
            <h2 className="font-bold text-[15px] text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
              <Smartphone size={16} className="text-accent" /> Where your data is processed
            </h2>
            <p className="text-sm text-secondary font-normal leading-relaxed">
              Every tool runs entirely in your browser. Text you paste, files you select, and values you enter are processed locally on your device using standard browser APIs (Canvas, Web Crypto, FileReader, and similar). ToolNest has no backend that receives your tool input.
            </p>
          </section>

          <section className="bg-card border border-subtle rounded-2xl p-5 sm:p-6">
            <h2 className="font-bold text-[15px] text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
              <HardDrive size={16} className="text-accent" /> Local storage we use
            </h2>
            <p className="text-sm text-secondary font-normal leading-relaxed">
              ToolNest uses your browser's local storage for a few convenience features:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-secondary font-normal">
              <li className="flex gap-2"><span className="text-accent font-bold">•</span> <span><strong className="text-neutral-900 dark:text-white">Theme preference</strong> — which theme (light/dark) you selected.</span></li>
              <li className="flex gap-2"><span className="text-accent font-bold">•</span> <span><strong className="text-neutral-900 dark:text-white">Bookmarks</strong> — the list of tools you saved to "My Tools".</span></li>
            </ul>
            <p className="text-sm text-secondary font-normal leading-relaxed mt-3">
              This data never leaves your browser. You can clear it at any time with your browser's site-data controls.
            </p>
          </section>

          <section className="bg-card border border-subtle rounded-2xl p-5 sm:p-6">
            <h2 className="font-bold text-[15px] text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
              <Cookie size={16} className="text-accent" /> Cookies, analytics, and third parties
            </h2>
            <p className="text-sm text-secondary font-normal leading-relaxed">
              ToolNest does not use advertising cookies, tracking pixels, or third-party analytics. We do not sell or share personal data because we do not collect it. No accounts are created and no personal information is requested.
            </p>
          </section>

          <section className="bg-card border border-subtle rounded-2xl p-5 sm:p-6">
            <h2 className="font-bold text-[15px] text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
              <Mail size={16} className="text-accent" /> Contact
            </h2>
            <p className="text-sm text-secondary font-normal leading-relaxed">
              ToolNest does not publish a corporate operator or email address, and this website does not collect contact information. If you have a privacy question, please reach out through the channel where you obtained this software (for example, the public project repository when one is published).
            </p>
          </section>

          <p className="text-xs text-faint font-normal">
            Last updated: November 2026. This policy describes the implementation as it exists today; if the product changes, this page will be updated to match.
          </p>
        </div>
      </div>
    </div>
  );
}
