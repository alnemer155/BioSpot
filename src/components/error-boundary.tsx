import { Component, type ReactNode } from "react";

interface State {
  error: Error | null;
}

// Prevents a silent black screen when something throws at startup.
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: "#f5f5f5", background: "#000", fontFamily: "monospace", minHeight: "100vh" }}>
          <h1 style={{ fontSize: 16, marginBottom: 12 }}>LinkTroo — something went wrong</h1>
          <pre style={{ fontSize: 12, whiteSpace: "pre-wrap", color: "#999" }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => {
              localStorage.clear();
              location.href = "/";
            }}
            style={{ marginTop: 16, padding: "8px 16px", background: "#fff", color: "#000", border: "none", cursor: "pointer" }}
          >
            Clear local data and reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
