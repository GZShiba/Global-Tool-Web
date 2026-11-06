import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * Minimal local component base. The project intentionally ships without
 * `@types/react` (React resolves as untyped `any`), so inheriting from
 * `React.Component` would lose all typed members.
 *
 * IMPORTANT: React classifies components as "class" vs "function" ONLY by
 * `prototype.isReactComponent` (see `shouldConstruct` in react-dom-client).
 * React.Component sets that marker; a plain base class does not, and React
 * would then CALL the boundary as a plain function — throwing
 * "Class constructor … cannot be invoked without 'new'" and blanking the
 * entire Admin Panel. The marker below restores correct classification.
 */
class BoundaryBase<P, S> {
  props: P;
  state: S;

  constructor(props: P) {
    this.props = props;
    this.state = {} as S;
  }

  setState(partial: Partial<S>): void {
    // When mounted, route through React's updater so the update is really
    // scheduled; fall back to direct mutation only if not mounted yet.
    const self = this as unknown as { updater?: { enqueueSetState(inst: unknown, p: Partial<S>): void } };
    if (self.updater) {
      self.updater.enqueueSetState(this, partial);
    } else {
      this.state = { ...this.state, ...partial };
    }
  }
}

// React's class-component marker (the only signal React uses to decide a
// component is a class — see shouldConstruct in react-dom-client).
(BoundaryBase.prototype as unknown as Record<string, unknown>).isReactComponent = {};

/**
 * Local render error boundary: one malformed record (e.g. a legacy bad
 * Firestore doc) must never blank the entire Admin Panel. Catches render
 * errors inside the wrapped manager and shows a recoverable panel instead.
 */
export default class ErrorBoundary extends BoundaryBase<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[admin] render error in section:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="bg-card border border-red-200 dark:border-red-900/50 rounded-2xl p-6 max-w-xl">
          <p className="font-bold text-sm text-red-600 dark:text-red-400 mb-1">
            This section hit a rendering error
          </p>
          <p className="text-xs text-secondary font-normal mb-4">
            {this.props.label ?? 'Admin content'}
          </p>
          <p className="text-xs text-secondary font-mono bg-inset rounded-lg p-3 mb-4 break-words">
            {String(this.state.error?.message || this.state.error)}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold hover:opacity-90"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
