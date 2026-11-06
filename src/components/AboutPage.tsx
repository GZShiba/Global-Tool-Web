import { Wrench, ShieldCheck, Zap, Heart, Compass, Mail, ChevronRight, Handshake, Bug, Lightbulb } from 'lucide-react';
import { useToolStore } from '../context/ToolContext';
import ContactForm from './ContactForm';

export default function AboutPage() {
  const { navigate, categories: catalogCategories, tools: catalogTools } = useToolStore();

  const principles = [
    { icon: <ShieldCheck size={24} />, title: 'Private by default', desc: 'Tools run in your browser. Your input never leaves your device.' },
    { icon: <Zap size={24} />, title: 'Instant and simple', desc: 'No sign-ups, no queues. Open a tool and use it immediately.' },
    { icon: <Heart size={24} />, title: 'Free for everyone', desc: 'Every tool is free, with no usage caps or paywalls.' },
    { icon: <Compass size={24} />, title: 'Honestly described', desc: 'We document what each tool does — and what it cannot do.' },
  ];

  const contactReasons = [
    { icon: <Handshake size={16} />, title: 'Advertising & Partnerships', desc: 'Collaboration, sponsorship, and media enquiries.' },
    { icon: <Bug size={16} />, title: 'Bug Reports', desc: 'Something not working? Tell us what happened.' },
    { icon: <Lightbulb size={16} />, title: 'Feature Suggestions', desc: 'Ideas that would make the platform better.' },
    { icon: <Wrench size={16} />, title: 'Tool Suggestions', desc: 'Request a tool you would find useful.' },
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
              <div><div className="text-3xl font-extrabold tracking-tight">{catalogTools.length}</div><div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mt-1">Tools</div></div>
              <div><div className="text-3xl font-extrabold tracking-tight">{catalogCategories.length}</div><div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mt-1">Categories</div></div>
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
            { q: 'Can I suggest a new tool?', a: 'Absolutely — we would love to hear what would save you time. Send us a suggestion using the contact form below.' },
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
        <section id="contact" aria-labelledby="contact-heading" className="scroll-mt-24">
          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-stretch lg:gap-8">
            {/* Introduction panel */}
            <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-neutral-950 p-6 text-white sm:rounded-[28px] sm:p-9 lg:p-10">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
                  backgroundSize: '42px 42px',
                }}
              />
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />

              <div className="relative flex h-full flex-col">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  Get in touch
                </span>

                <h2
                  id="contact-heading"
                  className="mt-5 text-[28px] font-extrabold leading-[1.08] tracking-tight sm:text-4xl lg:text-[34px]"
                >
                  Let’s start a <span className="text-neutral-400">conversation.</span>
                </h2>
                <p className="mt-3 max-w-sm text-sm font-normal leading-relaxed text-neutral-400">
                  Have a question, spotted something that needs fixing, or want to suggest a tool? Tell us what you have
                  in mind — messages go directly to the OmniToolify team.
                </p>

                <div className="mt-7 grid grid-cols-1 gap-4 border-t border-white/10 pt-6 sm:grid-cols-2 lg:grid-cols-1 lg:gap-3">
                  {contactReasons.map((reason, index) => (
                    <div
                      key={reason.title}
                      className={`flex items-start gap-3 ${index > 0 ? 'lg:border-t lg:border-white/10 lg:pt-3' : ''}`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-blue-300">
                        {reason.icon}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-[13px] font-semibold leading-snug text-white">{reason.title}</h3>
                        <p className="mt-0.5 text-xs font-normal leading-relaxed text-neutral-400">{reason.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-auto flex items-start gap-2.5 border-t border-white/10 pt-5">
                  <ShieldCheck size={15} className="mt-0.5 shrink-0 text-blue-300" />
                  <p className="text-[11px] font-normal leading-relaxed text-neutral-400">
                    Private by default — submissions are only visible to the OmniToolify team.
                  </p>
                </div>
              </div>
            </div>

            {/* Form panel */}
            <div className="relative overflow-hidden rounded-[24px] border border-subtle bg-card p-5 shadow-xl shadow-black/[0.03] sm:rounded-[28px] sm:p-8 lg:p-9 dark:shadow-black/40">
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

              <div className="mb-6 flex items-start justify-between gap-4 border-b border-subtle pb-5">
                <div>
                  <h3 className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white sm:text-xl">
                    Send us a message
                  </h3>
                  <p className="mt-1.5 text-xs font-normal leading-relaxed text-secondary sm:text-[13px]">
                    Tell us what you have in mind — all fields are required.
                  </p>
                </div>
                <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent sm:flex">
                  <Mail size={18} />
                </span>
              </div>

              <ContactForm />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
