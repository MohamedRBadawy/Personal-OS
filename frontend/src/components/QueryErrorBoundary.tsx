import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react'

type State = {
  hasError: boolean
  error: Error | null
}

type QueryErrorBoundaryProps = PropsWithChildren<{
  fallback?: (error: Error, reset: () => void) => ReactNode
}>

export class QueryErrorBoundary extends Component<QueryErrorBoundaryProps, State> {
  constructor(props: QueryErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('QueryErrorBoundary caught:', error, info)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset)
      }
      return (
        <div className="query-error-boundary">
          <p className="query-error-boundary__title">Something went wrong loading this page.</p>
          <p className="query-error-boundary__message">{this.state.error.message}</p>
          <button type="button" onClick={this.reset}>Try again</button>
        </div>
      )
    }
    return this.props.children
  }
}
