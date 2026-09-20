import React, { Component, ReactNode } from 'react'
import { Dna } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })
    
    // Log to console for development
    console.error('Serina Dashboard Error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-slate-900 rounded-xl shadow-lg border border-red-800 p-8">
              {/* Error Icon */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-950 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-slate-100 mb-2 flex items-center justify-center gap-2">
                  <Dna className="w-6 h-6" /> Serina Dashboard Error
                </h1>
                <p className="text-slate-400">
                  Something went wrong with the evolutionary simulation interface
                </p>
              </div>

              {/* Error Details */}
              <div className="bg-red-950 border border-red-800 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-red-300 mb-2">Error Details:</h3>
                <p className="text-red-300 text-sm font-mono">
                  {this.state.error?.message || 'Unknown error occurred'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleReset}
                  className="button-primary"
                >
                  Try Again
                </button>
                <button
                  onClick={this.handleReload}
                  className="button-secondary"
                >
                  Reload Dashboard
                </button>
              </div>

              {/* Debug Info (Development Only) */}
              {import.meta.env.DEV && this.state.errorInfo && (
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm text-slate-400 hover:text-slate-200">
                    Show Debug Information
                  </summary>
                  <div className="mt-3 bg-slate-800 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-200 mb-2">Stack Trace:</h4>
                    <pre className="text-xs text-slate-400 overflow-auto max-h-64">
                      {this.state.error?.stack}
                    </pre>
                    <h4 className="font-semibold text-slate-200 mb-2 mt-4">Component Stack:</h4>
                    <pre className="text-xs text-slate-400 overflow-auto max-h-32">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                </details>
              )}

              {/* Support Info */}
              <div className="mt-6 text-center text-sm text-slate-500">
                <p>
                  Need help? Check the{' '}
                  <a
                    href="https://github.com/SaniAdamou14/Serina/issues"
                    className="text-primary-400 hover:text-primary-300"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub Issues
                  </a>
                  {' '}or contact the development team.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}