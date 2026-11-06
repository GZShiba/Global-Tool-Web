import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Mail, Send, Loader2, CheckCircle2, AlertCircle, ChevronDown, ShieldCheck } from 'lucide-react';
import {
  CUSTOM_SUBJECT_ID, LIMITS, getEnabledSubjects, submitContactMessage, validateContactInput,
} from '../lib/contactMessages';
import type { ContactSubjectOption } from '../lib/contactMessages';

interface FormState {
  name: string;
  email: string;
  subjectType: string;
  subject: string;
  message: string;
}

const EMPTY_FORM: FormState = { name: '', email: '', subjectType: '', subject: '', message: '' };

type Errors = Partial<Record<keyof FormState, string>>;

const LABEL_CLASS = 'mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-secondary';
const FIELD_BASE =
  'w-full rounded-xl border bg-inset px-4 py-3 text-[13px] font-medium text-neutral-900 outline-none transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-faint hover:border-neutral-300 focus:ring-4 dark:text-white dark:hover:border-neutral-700';
const FIELD_OK =
  'border-subtle focus:border-blue-500/70 focus:ring-blue-500/10 dark:focus:border-blue-400/60 dark:focus:ring-blue-400/10';
const FIELD_ERROR =
  'border-red-400/70 focus:border-red-500 focus:ring-red-500/10 dark:border-red-500/50';
const ERROR_TEXT = 'mt-1.5 text-[11px] font-medium leading-relaxed text-red-600 dark:text-red-400';

const fieldClass = (invalid: boolean) => `${FIELD_BASE} ${invalid ? FIELD_ERROR : FIELD_OK}`;

export default function ContactForm() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [subjects, setSubjects] = useState<ContactSubjectOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState('');

  useEffect(() => {
    let alive = true;
    getEnabledSubjects().then(list => { if (alive) setSubjects(list); });
    return () => { alive = false; };
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return; // prevent accidental double submission
    // Honeypot: if filled, silently accept (bots) but do not save.
    if (honeypot.trim()) return;

    const next = validateContactInput(form);
    setErrors(next);
    if (Object.keys(next).some(k => next[k as keyof FormState])) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const docId = await submitContactMessage(form);
      if (docId) {
        setForm(EMPTY_FORM);
        setSubmitted(true);
      }
    } catch (err) {
      // Preserve entered data; show an understandable error.
      setSubmitError(err instanceof Error ? err.message : 'Your message could not be sent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isCustom = form.subjectType === CUSTOM_SUBJECT_ID;
  const nearLimit = form.message.length > LIMITS.messageMax * 0.9;
  const overLimit = form.message.length > LIMITS.messageMax;

  if (submitted) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center justify-center px-2 py-12 text-center sm:py-16"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400">
          <CheckCircle2 size={30} strokeWidth={1.75} />
        </div>
        <span className="mt-6 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400">
          Message received
        </span>
        <h3 className="mt-2 text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white sm:text-2xl">
          Thanks for reaching out.
        </h3>
        <p className="mt-3 max-w-sm text-sm font-normal leading-relaxed text-secondary">
          Your message has been received and will be reviewed by the OmniToolify team.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-7 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-subtle px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-secondary transition-all hover:border-neutral-400 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 active:scale-[0.98] dark:hover:border-neutral-600 dark:hover:text-white"
        >
          <Mail size={14} /> Send another message
        </button>
        <p className="mt-6 flex items-center gap-1.5 text-[11px] font-normal text-faint">
          <ShieldCheck size={13} className="shrink-0" />
          No account was created — your message is only visible to the OmniToolify team.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="text-left" aria-busy={submitting}>
      {/* Honeypot — hidden from humans, filled by naive bots */}
      <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="contact_company_website">Company website</label>
        <input
          id="contact_company_website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={e => setHoneypot(e.target.value)}
        />
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          <div>
            <label htmlFor="contact-name" className={LABEL_CLASS}>Name</label>
            <input
              id="contact-name"
              type="text"
              autoComplete="name"
              maxLength={LIMITS.nameMax}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'contact-name-error' : undefined}
              className={fieldClass(Boolean(errors.name))}
              placeholder="Your name"
            />
            {errors.name && <p id="contact-name-error" className={ERROR_TEXT}>{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="contact-email" className={LABEL_CLASS}>Email address</label>
            <input
              id="contact-email"
              type="email"
              autoComplete="email"
              maxLength={LIMITS.emailMax}
              value={form.email}
              onChange={e => set('email', e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'contact-email-error' : undefined}
              className={fieldClass(Boolean(errors.email))}
              placeholder="you@example.com"
            />
            {errors.email && <p id="contact-email-error" className={ERROR_TEXT}>{errors.email}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="contact-subject-type" className={LABEL_CLASS}>Subject</label>
          <div className="relative">
            <select
              id="contact-subject-type"
              value={form.subjectType}
              onChange={e => {
                set('subjectType', e.target.value);
                if (e.target.value !== CUSTOM_SUBJECT_ID) {
                  const opt = subjects.find(s => s.id === e.target.value);
                  if (opt) set('subject', opt.label);
                }
              }}
              aria-invalid={Boolean(errors.subjectType)}
              aria-describedby={errors.subjectType ? 'contact-subject-type-error' : undefined}
              className={`${fieldClass(Boolean(errors.subjectType))} cursor-pointer appearance-none pr-11 [color-scheme:light] dark:[color-scheme:dark]`}
            >
              <option value="">Choose a subject…</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
              <option value={CUSTOM_SUBJECT_ID}>Custom Subject</option>
            </select>
            <ChevronDown
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-faint"
            />
          </div>

          {/* Custom subject — mounted for a smooth height/fade reveal, inert while hidden */}
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-out ${isCustom ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
          >
            <div className="min-h-0 overflow-hidden" inert={!isCustom} aria-hidden={!isCustom}>
              <div className={`pt-3 transition-opacity duration-300 ${isCustom ? 'opacity-100' : 'opacity-0'}`}>
                <label htmlFor="contact-subject-custom" className={LABEL_CLASS}>Custom subject</label>
                <input
                  id="contact-subject-custom"
                  type="text"
                  maxLength={LIMITS.subjectMax}
                  value={form.subject}
                  onChange={e => set('subject', e.target.value)}
                  aria-invalid={Boolean(errors.subject)}
                  aria-describedby={errors.subject ? 'contact-subject-error' : undefined}
                  tabIndex={isCustom ? undefined : -1}
                  className={fieldClass(Boolean(errors.subject))}
                  placeholder="Enter a subject"
                />
              </div>
            </div>
          </div>

          {errors.subjectType && (
            <p id="contact-subject-type-error" className={ERROR_TEXT}>{errors.subjectType}</p>
          )}
          {isCustom && errors.subject && (
            <p id="contact-subject-error" className={ERROR_TEXT}>{errors.subject}</p>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between gap-4">
            <label htmlFor="contact-message" className={`${LABEL_CLASS} mb-0`}>Message</label>
            <span
              aria-hidden="true"
              title={`Maximum ${LIMITS.messageMax} characters`}
              className={`text-[10px] font-medium tabular-nums ${
                overLimit
                  ? 'text-red-600 dark:text-red-400'
                  : nearLimit
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-faint'
              }`}
            >
              {form.message.length} / {LIMITS.messageMax}
            </span>
          </div>
          <textarea
            id="contact-message"
            rows={5}
            maxLength={LIMITS.messageMax + 1}
            value={form.message}
            onChange={e => set('message', e.target.value)}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? 'contact-message-error' : undefined}
            className={`${fieldClass(Boolean(errors.message))} min-h-[150px] resize-y leading-relaxed`}
            placeholder="Tell us what you need help with, or what you would like to see…"
          />
          {errors.message && <p id="contact-message-error" className={ERROR_TEXT}>{errors.message}</p>}
        </div>

        {submitError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200/80 bg-red-50 px-4 py-3.5 dark:border-red-900/50 dark:bg-red-950/25"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
                Message not sent
              </p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-red-700/90 dark:text-red-300/90">
                {submitError}
              </p>
            </div>
          </div>
        )}

        <div className="pt-0.5">
          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="group inline-flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-xl bg-neutral-900 px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-neutral-900/10 transition-all hover:bg-neutral-800 hover:shadow-neutral-900/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:shadow-black/20 dark:hover:bg-neutral-200"
          >
            {submitting ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Sending message…
              </>
            ) : (
              <>
                <Send
                  size={15}
                  className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
                Send message
              </>
            )}
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] font-normal leading-relaxed text-faint">
            <ShieldCheck size={12} className="shrink-0" />
            Your details are only used to respond to this message.
          </p>
        </div>
      </div>
    </form>
  );
}
