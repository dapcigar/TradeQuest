import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean };

/**
 * Prevent a failed lazy-loaded route chunk from taking down the entire app shell.
 * The recovery action reloads the app so the browser can fetch the current build's chunks.
 */
export default class LearningRouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    // Avoid logging learner data or component props; keep diagnostics minimal.
    console.error('A learning route failed to render.', { name: error.name });
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="panel module-load-error" role="alert" aria-labelledby="module-load-error-title">
          <h2 id="module-load-error-title">This learning module could not load</h2>
          <p>Your saved progress has not been changed by this loading error. Reload TradeQuest to try loading the current version again.</p>
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
            Reload TradeQuest
          </button>
        </section>
      );
    }

    return this.props.children;
  }
}
