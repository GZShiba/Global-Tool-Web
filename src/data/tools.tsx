import { ReactNode } from 'react';
import {
  Type, Repeat, Sparkles, Code2, Calculator, Image, FileText, Replace,
  AlignLeft, Link2, Braces, Table2, Binary, Link, Hash, Binary as BinaryIcon,
  KeyRound, Fingerprint, Regex, Palette, CodeXml, Percent, Ruler, HeartPulse,
  Scaling, FileImage, Wrench,
} from 'lucide-react';
import { Tool, ToolCategory } from '../types';

const icon = (Icon: any, size = 28): ReactNode => <Icon size={size} strokeWidth={1.5} />;

export const categories: ToolCategory[] = [
  { id: 'text', name: 'Text', description: 'Count, transform, and clean up text instantly', icon: icon(Type) },
  { id: 'converters', name: 'Converters', description: 'Convert between formats, encodings, and number systems', icon: icon(Repeat) },
  { id: 'generators', name: 'Generators', description: 'Create UUIDs, passwords, and secure hashes', icon: icon(Sparkles) },
  { id: 'web-dev', name: 'Web & Dev', description: 'Everyday utilities for developers and designers', icon: icon(Code2) },
  { id: 'calculators', name: 'Calculators', description: 'Quick calculations and unit conversions', icon: icon(Calculator) },
  { id: 'files', name: 'Files & Media', description: 'Resize, convert, and encode images locally', icon: icon(Image) },
];

const t = (tool: Omit<Tool, 'slug'>): Tool => ({ ...tool, slug: tool.id });

export const tools: Tool[] = [
  // ---------------- TEXT ----------------
  t({
    id: 'word-counter', name: 'Word Counter', tagline: 'Live word, character, and reading-time statistics',
    description: 'Paste any text and see live statistics: words, characters (with and without spaces), sentences, paragraphs, and estimated reading time. Nothing is stored or sent anywhere.',
    icon: icon(FileText), category: 'text', tags: ['writing', 'text', 'analysis'], popular: true,
    features: ['Live counting as you type', 'Word, character, sentence, and paragraph counts', 'Estimated reading time at ~200 words per minute', 'Longest word identification'],
    useCases: ['Checking essay or article length limits', 'Previewing reading time for blog posts', 'Measuring text for social media constraints'],
    howTo: ['Paste or type your text into the editor.', 'Statistics update automatically as you type or edit.', 'Use "Clear" to start over.'],
    privacy: 'All analysis happens in your browser. Your text never leaves your device.',
  }),
  t({
    id: 'case-converter', name: 'Case Converter', tagline: 'Convert text between eight different letter cases',
    description: 'Transform text into UPPERCASE, lowercase, Title Case, Sentence case, camelCase, PascalCase, snake_case, or kebab-case with one click.',
    icon: icon(Replace), category: 'text', tags: ['text', 'formatting', 'developer'], popular: true,
    features: ['Eight conversion modes', 'One-click copy of the result', 'Live preview of every case style'],
    useCases: ['Formatting headings and titles', 'Producing camelCase or snake_case identifiers for code', 'Normalizing imported data'],
    howTo: ['Type or paste your text into the input box.', 'Click any case button to convert the text.', 'Copy the converted result with the copy button.'],
    privacy: 'Conversion runs entirely in your browser.',
  }),
  t({
    id: 'lorem-ipsum', name: 'Lorem Ipsum Generator', tagline: 'Generate placeholder text by paragraphs, sentences, or words',
    description: 'Generate classic Lorem Ipsum placeholder text for layouts, mockups, and design prototypes. Control the amount and structure (paragraphs, sentences, or words).',
    icon: icon(AlignLeft), category: 'text', tags: ['design', 'placeholder', 'text'],
    features: ['Generate by paragraphs, sentences, or words', 'Adjustable quantity (1–50)', 'Option to start with the classic "Lorem ipsum dolor sit amet" opening'],
    useCases: ['Filling wireframes and mockups with realistic text volume', 'Testing typography and line length', 'Creating sample content for CMS templates'],
    howTo: ['Choose whether to generate paragraphs, sentences, or words.', 'Set the quantity with the number input.', 'Click Generate, then copy the result.'],
    privacy: 'Text is generated locally with a random generator in your browser.',
  }),
  t({
    id: 'slug-generator', name: 'Slug Generator', tagline: 'Turn any title into a clean, URL-safe slug',
    description: 'Convert titles and headings into URL-safe slugs: lowercase, accent characters transliterated, spaces and symbols replaced with hyphens, and duplicate hyphens collapsed.',
    icon: icon(Link2), category: 'text', tags: ['seo', 'url', 'text'],
    features: ['Accent transliteration (é → e, ü → u)', 'Configurable separator (hyphen or underscore)', 'Optional stop-word removal for shorter slugs'],
    useCases: ['Creating SEO-friendly URLs for blog posts', 'Generating file names from titles', 'Building clean identifiers from labels'],
    howTo: ['Type a title into the input.', 'The slug updates live as you type.', 'Choose a separator and options, then copy the slug.'],
    privacy: 'Runs entirely in your browser.',
  }),

  // ---------------- CONVERTERS ----------------
  t({
    id: 'json-formatter', name: 'JSON Formatter', tagline: 'Format, minify, and validate JSON with error locations',
    description: 'Beautify messy JSON with configurable indentation, minify it for production, or validate it and see exactly where a syntax error occurred.',
    icon: icon(Braces), category: 'converters', tags: ['json', 'developer', 'formatting'], popular: true,
    features: ['Beautify with 2 or 4 space indentation', 'Minify to a single line', 'Validation with precise error position', 'One-click copy'],
    useCases: ['Reading API responses and config files', 'Reducing payload size before deployment', 'Locating syntax errors in large JSON documents'],
    howTo: ['Paste JSON into the input area.', 'Choose Beautify, Minify, or Validate.', 'Copy the result or fix the reported error.'],
    notes: [{ label: 'Input limit', value: 'Handles documents up to several MB; very large files may be slow in older browsers' }],
    privacy: 'Parsing and formatting happen in your browser — data is never uploaded.',
  }),
  t({
    id: 'csv-json-converter', name: 'CSV ⇄ JSON Converter', tagline: 'Two-way conversion between CSV and JSON arrays',
    description: 'Convert comma-separated data into a JSON array of objects (using the header row as keys), and convert a JSON array of flat objects back into CSV.',
    icon: icon(Table2), category: 'converters', tags: ['csv', 'json', 'data', 'spreadsheet'],
    features: ['CSV to JSON with header row as object keys', 'JSON array of objects to CSV', 'Quoted-field aware CSV parsing', 'Custom delimiter (comma, semicolon, tab)'],
    useCases: ['Preparing spreadsheet data for APIs', 'Inspecting exported CSV data as structured JSON', 'Moving data between tools and languages'],
    howTo: ['Select the conversion direction (CSV → JSON or JSON → CSV).', 'Paste your data into the input area.', 'Choose a delimiter if needed, then copy the converted output.'],
    notes: [{ label: 'CSV → JSON', value: 'First row is treated as the header' }, { label: 'JSON → CSV', value: 'Expects an array of flat objects; nested objects are skipped' }],
    privacy: 'Conversion happens locally in your browser.',
  }),
  t({
    id: 'base64-encoder', name: 'Base64 Encoder / Decoder', tagline: 'Encode text to Base64 or decode it back',
    description: 'Convert plain text to Base64 and decode Base64 strings back to readable text, with full Unicode support.',
    icon: icon(Binary), category: 'converters', tags: ['base64', 'encoding', 'developer'],
    features: ['Encode and decode modes', 'Unicode-safe (emoji and non-Latin scripts)', 'URL-safe Base64 option for encoding'],
    useCases: ['Encoding credentials for HTTP Basic auth headers', 'Decoding tokens and data URIs', 'Quickly inspecting Base64 payloads'],
    howTo: ['Choose Encode or Decode.', 'Enter your text in the input field.', 'Copy the converted output.'],
    notes: [{ label: 'Note', value: 'Base64 is an encoding, not encryption — it provides no confidentiality' }],
    privacy: 'Encoding and decoding run locally in your browser.',
  }),
  t({
    id: 'url-encoder', name: 'URL Encoder / Decoder', tagline: 'Percent-encode or decode URLs and query parameters',
    description: 'Encode special characters for safe use in URLs and query strings, or decode percent-encoded text back to its original form.',
    icon: icon(Link), category: 'converters', tags: ['url', 'encoding', 'web'],
    features: ['Component mode (for query values) and full-URI mode', 'Decode malformed input with error reporting', 'Live conversion while typing'],
    useCases: ['Building query strings with user input', 'Debugging encoded redirect URLs', 'Preparing text for use in links'],
    howTo: ['Choose Encode or Decode.', 'Select whether your input is a full URL or a single component.', 'Paste text and copy the result.'],
    privacy: 'Runs entirely in your browser.',
  }),
  t({
    id: 'number-base', name: 'Number Base Converter', tagline: 'Convert between binary, octal, decimal, and hexadecimal',
    description: 'Convert integers between binary (base 2), octal (base 8), decimal (base 10), and hexadecimal (base 16), with any custom base from 2 to 36.',
    icon: icon(BinaryIcon), category: 'converters', tags: ['numbers', 'developer', 'math'],
    features: ['Simultaneous display in bases 2, 8, 10, and 16', 'Custom base support (2–36)', 'Input validation for the selected base'],
    useCases: ['Reading memory addresses and color codes', 'Working with bit flags and masks', 'Teaching or learning positional number systems'],
    howTo: ['Enter a number in any base field.', 'All other base fields update instantly.', 'For a custom base, enter the base number and value.'],
    notes: [{ label: 'Range', value: 'Integers within JavaScript\'s safe integer range (±2⁵³ − 1)' }],
    privacy: 'Runs entirely in your browser.',
  }),
  t({
    id: 'timestamp-converter', name: 'Unix Timestamp Converter', tagline: 'Convert Unix timestamps to dates and back',
    description: 'Convert Unix timestamps (seconds or milliseconds) into readable UTC and local date-time strings, or pick a date to get its timestamp.',
    icon: icon(Hash), category: 'converters', tags: ['time', 'date', 'developer'],
    features: ['Detects seconds vs. milliseconds automatically', 'Shows UTC and your local timezone', 'Current timestamp at a glance', 'Date picker for timestamp generation'],
    useCases: ['Interpreting API timestamps and log entries', 'Setting expiry times in tokens and caches', 'Scheduling tasks in cron-like systems'],
    howTo: ['Paste a timestamp to see its date, or pick a date/time to get its timestamp.', 'The current timestamp updates every second.', 'Copy either value with one click.'],
    privacy: 'Runs entirely in your browser.',
  }),

  // ---------------- GENERATORS ----------------
  t({
    id: 'uuid-generator', name: 'UUID Generator', tagline: 'Generate cryptographically random UUIDs (v4)',
    description: 'Generate one or many random UUID version 4 identifiers using your browser\'s built-in cryptographic random number generator.',
    icon: icon(Fingerprint), category: 'generators', tags: ['uuid', 'id', 'developer'], popular: true,
    features: ['Generate up to 100 UUIDs at once', 'Uppercase and no-hyphen formatting options', 'Copy all or copy individually'],
    useCases: ['Creating database primary keys and correlation IDs', 'Naming test fixtures and files', 'Generating request IDs for logging'],
    howTo: ['Choose how many UUIDs you need.', 'Click Generate.', 'Copy a single UUID or the whole list.'],
    privacy: 'Generated locally using the Web Crypto API. Nothing is transmitted or stored.',
  }),
  t({
    id: 'password-generator', name: 'Password Generator', tagline: 'Create strong random passwords with custom rules',
    description: 'Generate strong, random passwords using your browser\'s cryptographic random number generator. Control length and character sets, and avoid ambiguous characters.',
    icon: icon(KeyRound), category: 'generators', tags: ['password', 'security', 'generator'], popular: true,
    features: ['Adjustable length (8–64 characters)', 'Toggle uppercase, lowercase, digits, and symbols', 'Exclude look-alike characters (l, 1, I, O, 0)', 'Live strength length indicator'],
    useCases: ['Creating new account passwords', 'Generating Wi-Fi or router passwords', 'Producing initial credentials for team members'],
    howTo: ['Set the desired length and toggle character sets.', 'Click Generate.', 'Copy the password with the copy button.'],
    notes: [{ label: 'Security', value: 'Passwords are generated in your browser with crypto.getRandomValues() and are never sent anywhere or stored' }],
    privacy: 'Generation happens locally using the Web Crypto API.',
  }),
  t({
    id: 'hash-generator', name: 'Hash Generator', tagline: 'Compute SHA-1, SHA-256, SHA-384, and SHA-512 hashes',
    description: 'Calculate cryptographic hash digests of any text using the Web Crypto API. Useful for verifying content, generating checksums, and fingerprinting strings.',
    icon: icon(Fingerprint), category: 'generators', tags: ['hash', 'security', 'developer'],
    features: ['SHA-1, SHA-256, SHA-384, and SHA-512 in one click', 'Compare against an expected digest', 'Uppercase output option'],
    useCases: ['Verifying that text or config content matches a known digest', 'Generating fingerprint values for deduplication', 'Learning how hashing behaves'],
    howTo: ['Enter the text to hash.', 'All supported digests are computed automatically.', 'Copy a digest or compare it with an expected value.'],
    notes: [{ label: 'Note', value: 'SHA-1 is provided for compatibility; prefer SHA-256 or stronger for new designs. Hashing is one-way — digests cannot be reversed.' }],
    privacy: 'Hashing happens in your browser via the Web Crypto API.',
  }),

  // ---------------- WEB & DEV ----------------
  t({
    id: 'regex-tester', name: 'Regex Tester', tagline: 'Test regular expressions against sample text with live match highlighting',
    description: 'Write a regular expression, choose flags, and test it against sample text. Matches are highlighted inline and listed with their capture groups.',
    icon: icon(Regex), category: 'web-dev', tags: ['regex', 'developer', 'testing'], popular: true,
    features: ['Live match highlighting in the sample text', 'Match list with capture groups', 'All JavaScript flags supported (g, i, m, s, u, y)', 'Invalid pattern errors shown inline'],
    useCases: ['Debugging patterns before shipping them to production', 'Learning regular expression syntax', 'Verifying validation rules'],
    howTo: ['Enter a pattern and toggle flags as needed.', 'Paste sample text into the test area.', 'Matches are highlighted and listed below; click a match to see its groups.'],
    notes: [{ label: 'Flavor', value: 'JavaScript (ECMAScript) regular expressions — behavior may differ slightly in other languages' }],
    privacy: 'Runs entirely in your browser.',
  }),
  t({
    id: 'color-converter', name: 'Color Converter', tagline: 'Convert colors between HEX, RGB, and HSL',
    description: 'Convert any color between HEX, RGB, and HSL notations with a live preview, color picker support, and ready-to-copy CSS declarations.',
    icon: icon(Palette), category: 'web-dev', tags: ['color', 'css', 'design'],
    features: ['HEX ⇄ RGB ⇄ HSL conversion', 'Native color picker integration', 'Live preview swatch', 'Copy as CSS variable or declaration'],
    useCases: ['Matching brand colors across CSS formats', 'Adjusting hue and saturation values by hand', 'Converting design tokens between formats'],
    howTo: ['Enter a HEX, RGB, or HSL value or use the picker.', 'All notations update live.', 'Copy any format with its copy button.'],
    privacy: 'Runs entirely in your browser.',
  }),
  t({
    id: 'html-entities', name: 'HTML Entities Encoder / Decoder', tagline: 'Escape or unescape HTML special characters',
    description: 'Convert characters like <, >, &, and quotes into their HTML entity equivalents, or decode entities back into readable text — essential when displaying code samples or user content safely.',
    icon: icon(CodeXml), category: 'web-dev', tags: ['html', 'encoding', 'web'],
    features: ['Encode all five XML-critical characters or full mode', 'Decode named and numeric entities', 'Live two-way conversion'],
    useCases: ['Showing code snippets inside HTML pages', 'Preventing markup injection in templates', 'Reading encoded text from feeds and APIs'],
    howTo: ['Choose Encode or Decode.', 'Paste your text.', 'Copy the converted output.'],
    notes: [{ label: 'Full mode', value: 'Encodes all non-ASCII characters as numeric entities for maximum compatibility' }],
    privacy: 'Runs entirely in your browser.',
  }),

  // ---------------- CALCULATORS ----------------
  t({
    id: 'percentage-calculator', name: 'Percentage Calculator', tagline: 'Four common percentage calculations in one place',
    description: 'Compute "X% of Y", "X is what percent of Y", percentage increase or decrease from X to Y, and add or subtract a percentage from a value.',
    icon: icon(Percent), category: 'calculators', tags: ['math', 'percentage', 'finance'],
    features: ['Four calculation modes with instant results', 'Reverse mode: find the percentage', 'Increase/decrease with sign display'],
    useCases: ['Calculating discounts, taxes, and tips', 'Comparing period-over-period changes', 'Working out marks and score percentages'],
    howTo: ['Pick the calculation type.', 'Enter the two known values.', 'The result appears instantly; enter new values to recalculate.'],
    privacy: 'Runs entirely in your browser.',
  }),
  t({
    id: 'unit-converter', name: 'Unit Converter', tagline: 'Convert length, weight, temperature, and data units',
    description: 'Convert values between common units of length, weight, temperature, and digital data — from millimeters to miles and bytes to gigabytes.',
    icon: icon(Ruler), category: 'calculators', tags: ['units', 'measurement', 'converter'],
    features: ['Four unit families with the most-used units', 'Accurate temperature formulas (not simple factors)', 'Two-way conversion with live results'],
    useCases: ['Converting measurements for international projects', 'Checking file size limits in different units', 'Everyday cooking, travel, and shipping questions'],
    howTo: ['Select a unit family (length, weight, temperature, data).', 'Enter a value and choose the from/to units.', 'The converted value appears instantly.'],
    privacy: 'Runs entirely in your browser.',
  }),
  t({
    id: 'bmi-calculator', name: 'BMI Calculator', tagline: 'Calculate Body Mass Index in metric or imperial units',
    description: 'Calculate Body Mass Index from height and weight in metric (cm/kg) or imperial (ft/lb) units, with the standard WHO weight category for adults.',
    icon: icon(HeartPulse), category: 'calculators', tags: ['health', 'bmi', 'calculator'],
    features: ['Metric and imperial input', 'WHO category with visual scale', 'Healthy weight range for your height'],
    useCases: ['Quick personal fitness tracking', 'Health screenings and questionnaires', 'Setting weight goals within a healthy range'],
    howTo: ['Choose metric or imperial units.', 'Enter your height and weight.', 'Your BMI, category, and healthy range appear instantly.'],
    notes: [{ label: 'Important', value: 'BMI is a general screening measure for adults and does not account for muscle mass, age, or body composition. It is not medical advice.' }],
    privacy: 'Runs entirely in your browser — your measurements are never stored or sent.',
  }),

  // ---------------- FILES & MEDIA ----------------
  t({
    id: 'image-resizer', name: 'Image Resizer & Converter', tagline: 'Resize images and convert between PNG, JPEG, and WebP',
    description: 'Resize images to exact dimensions or by percentage, and convert them to PNG, JPEG, or WebP — all processed locally with the browser\'s canvas engine.',
    icon: icon(Scaling), category: 'files', tags: ['image', 'resize', 'converter'], popular: true, isNew: true,
    features: ['Resize by exact width/height or percentage', 'Preserve aspect ratio automatically', 'Convert to PNG, JPEG (quality control), or WebP', 'Before/after file size comparison'],
    useCases: ['Preparing images for websites and email', 'Creating thumbnails from large photos', 'Converting screenshots between formats'],
    howTo: ['Select an image file (PNG, JPEG, WebP, or GIF).', 'Set new dimensions or a scale percentage.', 'Choose the output format and quality, then click Resize & Download.'],
    notes: [{ label: 'Supported input', value: 'PNG, JPEG, WebP, GIF (first frame). Maximum file size depends on available device memory.' }, { label: 'JPEG output', value: 'Transparency is flattened to white, since JPEG does not support alpha' }],
    privacy: 'Images are processed entirely in your browser and are never uploaded to any server.',
  }),
  t({
    id: 'image-to-base64', name: 'Image to Base64', tagline: 'Convert images to Base64 data URIs for embedding',
    description: 'Encode an image as a Base64 data URI you can paste directly into HTML, CSS, or JSON — useful for small icons and inline assets.',
    icon: icon(FileImage), category: 'files', tags: ['image', 'base64', 'developer'], isNew: true,
    features: ['Outputs ready-to-use data URI', 'Shows encoded size vs. original size', 'Copy as data URI, CSS url(), or HTML img tag'],
    useCases: ['Inlining small logos and icons to reduce requests', 'Embedding images in single-file HTML or CSS', 'Storing images inside JSON configs'],
    howTo: ['Select an image file.', 'Choose the output format (data URI, CSS, or HTML).', 'Copy the encoded result.'],
    notes: [{ label: 'Best for', value: 'Small images (a few KB). Base64 increases size by ~33%, so large images are better served as separate files.' }],
    privacy: 'Files are read locally by your browser and never uploaded.',
  }),
];

export const getToolBySlug = (slug: string): Tool | undefined => tools.find(tool => tool.slug === slug);

export const getCategory = (id: string): ToolCategory | undefined => categories.find(c => c.id === id);

export const getToolsByCategory = (categoryId: string): Tool[] =>
  categoryId === 'all' ? tools : tools.filter(tool => tool.category === categoryId);

export const getPopularTools = (): Tool[] => tools.filter(tool => tool.popular);

export const getRelatedTools = (tool: Tool, count = 4): Tool[] => {
  const sameCategory = tools.filter(t2 => t2.category === tool.category && t2.id !== tool.id);
  const others = tools.filter(t2 => t2.category !== tool.category && t2.popular && t2.id !== tool.id);
  return [...sameCategory, ...others].slice(0, count);
};

export const searchTools = (query: string): Tool[] => {
  const q = query.trim().toLowerCase();
  if (!q) return tools;
  return tools.filter(tool =>
    tool.name.toLowerCase().includes(q) ||
    tool.tagline.toLowerCase().includes(q) ||
    tool.description.toLowerCase().includes(q) ||
    tool.tags.some(tag => tag.includes(q)) ||
    tool.category.includes(q)
  );
};

export { Wrench as BrandIcon };
