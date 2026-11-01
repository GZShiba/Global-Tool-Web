import { useState } from 'react';
import { Wrench, ShieldCheck, Zap, Heart, Compass, Mail, Check, ChevronRight } from 'lucide-react';
import { useToolStore } from '../context/ToolContext';
import { categories, tools } from '../data/tools';

export default function AboutPage() {
  const { navigate } = useToolStore();
  const [copied, setCopied] = useState(false);
  const contactEmail = 'hello@toolnest.app';

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(contactEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };

  const principles = [
    { icon: <ShieldCheck size={24} />, title: 'Private by default', desc: 'Tools run in your browser. Your input never leaves your device.' },
    { icon: <Zap size={24} />, title: 'Instant and simple', desc: 'No sign-ups, no queues. Open a tool and use it immediately.' },
    { icon: <Heart size={24} />, title: 'Free for everyone', desc: 'Every tool is free, with no usage caps or paywalls.' },
    { icon: <Compass size={24} />, title: 'Honestly described', desc: 'We document what each tool does — and what it cannot do.' },
  ];

  return (
    <div className="min-h-screen pb-20">
      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
          <button onClick={() => navigate('home')} className="hover:text-black dark:hover:text-white transition-colors font-semibold">Home</button>
          <ChevronRight size={14} />
          <span className="text-black dark:text-white font-bold">About</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Hero */}
        <div className="bg-neutral-950 text-white rounded-[28px] sm:rounded-[32px] p-8 sm:p-14 relative overflow-hidden mb-10">
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '44px 44px' }}
          />
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center">
                <Wrench className="text-neutral-900" size={22} />
              </span>
              <span className="text-2xl font-extrabold tracking-tight">OmniToolify</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-none mb-5">
              Useful tools, <span className="text-gray-400">honestly built.</span>
            </h1>
            <p className="text-gray-300 text-sm sm:text-base font-medium leading-relaxed">
              OmniToolify is a global collection of free online tools for developers, designers, students, and anyone who works with text, numbers, images, or the web. No accounts, no uploads, no games — just tools that work.
            </p>
            <div className="flex flex-wrap gap-6 mt-8">
              <div><div className="text-3xl font-extrabold tracking-tight">{tools.length}</div><div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mt-1">Tools</div></div>
              <div><div className="text-3xl font-extrabold tracking-tight">{categories.length}</div><div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mt-1">Categories</div></div>
              <div><div className="text-3xl font-extrabold tracking-tight">0</div><div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mt-1">Sign-ups required</div></div>
            </div>
          </div>
        </div>

        {/* Principles */}
        <h2 className="text-xl sm:text-2xl md:text-[28px] font-extrabold text-neutral-900 dark:text-white tracking-tight mb-6">What we stand for</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5 mb-12">
          {principles.map(p => (
            <div key={p.title} className="bg-card border border-subtle rounded-2xl sm:rounded-3xl p-6 sm:p-8 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors group">
              <div className="w-12 h-12 bg-inset rounded-2xl flex items-center justify-center text-secondary group-hover:bg-neutral-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-all mb-5">
                {p.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight mb-2">{p.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <h2 className="text-xl sm:text-2xl md:text-[28px] font-extrabold text-neutral-900 dark:text-white tracking-tight mb-6">Frequently asked questions</h2>
        <div className="space-y-4 mb-12">
          {[
            { q: 'Is OmniToolify really free?', a: 'Yes. Every tool on the platform is free to use with no usage limits, no accounts, and no paywalls.' },
            { q: 'Is my data safe?', a: 'Yes — by design. All tools run entirely in your browser using standard web technology. Your text, files, and numbers are never uploaded to any server. Saved tools ("My Tools") are stored only in your own browser.' },
            { q: 'Do I need to create an account?', a: 'No. There are no accounts. Bookmark tools with the bookmark icon and they will be waiting for you in "My Tools" on the same device and browser.' },
            { q: 'What are the limits of the tools?', a: 'Each tool page documents its supported formats and limitations in the "Good to know" section. Since processing happens on your device, very large files may be limited by your device memory.' },
            { q: 'Can I suggest a new tool?', a: 'Absolutely — we would love to hear what would save you time. Reach out using the contact details below.' },
          ].map(item => (
            <details key={item.q} className="group bg-card border border-subtle rounded-2xl overflow-hidden">
              <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none font-bold text-sm text-neutral-900 dark:text-white hover:bg-inset transition-colors">
                {item.q}
                <ChevronRight size={16} className="text-gray-400 transition-transform group-open:rotate-90 shrink-0" />
              </summary>
              <p className="px-5 pb-5 text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>

        {/* Contact */}
        <div className="bg-card border border-subtle rounded-[24px] p-8 sm:p-12 text-center">
          <Mail size={28} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight mb-2">Get in touch</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium max-w-md mx-auto mb-6">
            Questions, feedback, or a tool suggestion? Email us — we read everything.
          </p>
          <button
            onClick={copyEmail}
            className="inline-flex items-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-all active:scale-95"
          >
            {copied ? <Check size={14} /> : <Mail size={14} />}
            {copied ? 'Copied!' : contactEmail}
          </button>
        </div>
      </div>
    </div>
  );
}
