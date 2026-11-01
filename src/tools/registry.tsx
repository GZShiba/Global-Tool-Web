import { lazy, ComponentType, Suspense, ReactNode } from 'react';

/* Each tool is lazy-loaded so the initial bundle stays small;
   code for a tool is fetched only when its page is opened. */

const WordCounter = lazy(() => import('./TextTools').then(m => ({ default: m.WordCounter })));
const CaseConverter = lazy(() => import('./TextTools').then(m => ({ default: m.CaseConverter })));
const LoremIpsum = lazy(() => import('./TextTools').then(m => ({ default: m.LoremIpsum })));
const SlugGenerator = lazy(() => import('./TextTools').then(m => ({ default: m.SlugGenerator })));
const JsonFormatter = lazy(() => import('./ConverterTools').then(m => ({ default: m.JsonFormatter })));
const CsvJsonConverter = lazy(() => import('./ConverterTools').then(m => ({ default: m.CsvJsonConverter })));
const Base64Tool = lazy(() => import('./ConverterTools').then(m => ({ default: m.Base64Tool })));
const UrlEncoder = lazy(() => import('./ConverterTools').then(m => ({ default: m.UrlEncoder })));
const NumberBaseTool = lazy(() => import('./ConverterTools').then(m => ({ default: m.NumberBaseTool })));
const TimestampConverter = lazy(() => import('./ConverterTools').then(m => ({ default: m.TimestampConverter })));
const UuidGenerator = lazy(() => import('./GeneratorTools').then(m => ({ default: m.UuidGenerator })));
const PasswordGenerator = lazy(() => import('./GeneratorTools').then(m => ({ default: m.PasswordGenerator })));
const HashGenerator = lazy(() => import('./GeneratorTools').then(m => ({ default: m.HashGenerator })));
const RegexTester = lazy(() => import('./DevTools').then(m => ({ default: m.RegexTester })));
const ColorConverter = lazy(() => import('./DevTools').then(m => ({ default: m.ColorConverter })));
const HtmlEntitiesTool = lazy(() => import('./DevTools').then(m => ({ default: m.HtmlEntitiesTool })));
const PercentageCalculator = lazy(() => import('./CalculatorTools').then(m => ({ default: m.PercentageCalculator })));
const UnitConverter = lazy(() => import('./CalculatorTools').then(m => ({ default: m.UnitConverter })));
const BmiCalculator = lazy(() => import('./CalculatorTools').then(m => ({ default: m.BmiCalculator })));
const ImageResizer = lazy(() => import('./FileTools').then(m => ({ default: m.ImageResizer })));
const ImageToBase64 = lazy(() => import('./FileTools').then(m => ({ default: m.ImageToBase64 })));

export function ToolLoader({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="py-16 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-200 dark:border-neutral-700 border-t-neutral-900 dark:border-t-white rounded-full animate-spin" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Loading tool…</span>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export const toolRegistry: Record<string, ComponentType> = {
  'word-counter': WordCounter,
  'case-converter': CaseConverter,
  'lorem-ipsum': LoremIpsum,
  'slug-generator': SlugGenerator,
  'json-formatter': JsonFormatter,
  'csv-json-converter': CsvJsonConverter,
  'base64-encoder': Base64Tool,
  'url-encoder': UrlEncoder,
  'number-base': NumberBaseTool,
  'timestamp-converter': TimestampConverter,
  'uuid-generator': UuidGenerator,
  'password-generator': PasswordGenerator,
  'hash-generator': HashGenerator,
  'regex-tester': RegexTester,
  'color-converter': ColorConverter,
  'html-entities': HtmlEntitiesTool,
  'percentage-calculator': PercentageCalculator,
  'unit-converter': UnitConverter,
  'bmi-calculator': BmiCalculator,
  'image-resizer': ImageResizer,
  'image-to-base64': ImageToBase64,
};
