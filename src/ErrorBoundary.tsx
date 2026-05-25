import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('App error caught by boundary:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white gap-4 p-8">
          <p className="text-red-400 font-bold">Something went wrong.</p>
          <p className="text-white/50 text-sm text-center max-w-md break-all">{this.state.error?.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs px-4 py-2 border border-white/20 rounded hover:bg-white/10 transition-colors"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
