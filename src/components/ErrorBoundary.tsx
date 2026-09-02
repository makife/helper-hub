import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

/** Render hataları tüm uygulamayı beyaz ekrana düşürmesin. */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Uygulama render hatası:", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <section className="w-full max-w-sm rounded-3xl border border-border bg-card p-7 shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-2xl">!</div>
          <h1 className="mt-4 text-xl font-black text-foreground">{translate("Bir şeyler ters gitti")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Uygulama beklenmeyen bir sorunla karşılaştı. Sayfayı yenileyerek tekrar deneyebilirsin.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="gradient-warm mt-5 w-full rounded-2xl py-3.5 font-bold text-primary-foreground shadow-soft"
          >
            Uygulamayı Yenile
          </button>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
