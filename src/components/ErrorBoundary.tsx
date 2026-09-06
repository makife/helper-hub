import { Component, type ErrorInfo, type ReactNode } from "react";
import { translate } from "@/lib/i18n";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

/** Render hataları tüm uygulamayı beyaz ekrana düşürmesin. */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Uygulama render hatası:", error, info.componentStack);
  }

  /** Sayfayı yeniden yüklemeden ekranı toparla; olmazsa ana ekrana dön. */
  handleRetry = () => {
    this.setState({ hasError: false, message: "" });
    if (window.location.pathname !== "/") {
      window.history.replaceState({}, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  /** Oturum/önbellek kaynaklı takılmalarda temiz başlangıç. */
  handleReset = () => {
    try {
      sessionStorage.clear();
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sb-") || k.startsWith("supabase"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      // depolama erişilemiyorsa yoksay
    }
    window.location.replace("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <section className="w-full max-w-sm rounded-3xl border border-border bg-card p-7 shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-2xl">!</div>
          <h1 className="mt-4 text-xl font-black text-foreground">{translate("Bir şeyler ters gitti")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {translate("Uygulama beklenmeyen bir sorunla karşılaştı. Sayfayı yenileyerek tekrar deneyebilirsin.")}
          </p>
          {this.state.message && (
            <p className="mt-3 break-words rounded-xl bg-muted p-3 text-left text-[11px] font-mono text-muted-foreground">
              {this.state.message}
            </p>
          )}
          <button
            type="button"
            onClick={this.handleRetry}
            className="gradient-warm mt-5 w-full rounded-2xl py-3.5 font-bold text-primary-foreground shadow-soft"
          >
            {translate("Tekrar dene")}
          </button>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-3 w-full rounded-2xl border border-border py-3 text-sm font-bold text-foreground"
          >
            {translate("Çıkış yap ve baştan başla")}
          </button>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
