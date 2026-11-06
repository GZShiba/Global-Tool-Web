/**
 * Read-only probe: verifies the exact React classification behavior for the
 * ErrorBoundary class shape. Uses the installed react-dom (19.x) — same
 * runtime the browser uses.
 */
const React = require('react');
const { renderToString } = require('react-dom/server');

// --- Replica of the FIXED ErrorBoundary.tsx class shape ---
class BoundaryBase {
  constructor(props) {
    this.props = props;
    this.state = {};
  }
  setState(partial) {
    const updater = this.updater;
    if (updater) updater.enqueueSetState(this, partial);
    else this.state = { ...this.state, ...partial };
  }
}
// The exact marker now added in ErrorBoundary.tsx:
BoundaryBase.prototype.isReactComponent = {};

class FixedBoundary extends BoundaryBase {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('[probe] componentDidCatch:', error.message);
  }
  render() {
    if (this.state.error) {
      return React.createElement('div', null, 'FALLBACK: ', String(this.state.error.message));
    }
    return this.props.children;
  }
}

// Mirror of react-dom-client's shouldConstruct:
function shouldConstruct(Component) {
  Component = Component.prototype;
  return !(!Component || !Component.isReactComponent);
}

function Throwing() {
  throw new Error('boom from child render');
}
function Fine() {
  return React.createElement('p', null, 'hello from fine child');
}

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? '[PASS]' : '[FAIL]'} ${name}${detail ? ' -> ' + detail : ''}`);
  if (!ok) failures++;
}

// 1) Classification gate must now see it as a class component.
check('shouldConstruct(FixedBoundary) === true', shouldConstruct(FixedBoundary) === true);

// 2) Fixed shape renders normally with a regular child.
try {
  const out = renderToString(React.createElement(FixedBoundary, null, React.createElement(Fine)));
  check('fixed shape renders normal children', out.includes('hello from fine child'), out);
} catch (err) {
  check('fixed shape renders normal children', false, `${err.constructor.name}: ${err.message}`);
}

// 3) Legacy server renderer limitation (not the client path) is documented:
//    the client reads the static via fiber.type.getDerivedStateFromError.
try {
  renderToString(React.createElement(FixedBoundary, null, React.createElement(Throwing)));
  check('fixed shape (server note)', false, 'unexpected: server swallowed the error');
} catch (err) {
  console.log('[NOTE] legacy server renderer rethrows child error (expected; client uses different boundary path): ' + err.message);
}

process.exit(failures ? 1 : 0);
