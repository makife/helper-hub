import { forwardRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Uygulamaya özgü onay penceresi (tarayıcı confirm() yerine) */
const ConfirmDialog = forwardRef<HTMLDivElement, Props>(({
  open,
  title,
  description,
  confirmLabel = "Evet",
  cancelLabel = "Vazgeç",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}, ref) => (
  <AnimatePresence>
    {open && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 z-[2000] bg-foreground/40 backdrop-blur-[2px]"
        />
        <div className="fixed inset-0 z-[2001] flex items-center justify-center p-6 pointer-events-none">
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            className="pointer-events-auto w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-lg"
          >
            <div
              className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${
                destructive ? "bg-destructive/10" : "bg-primary/10"
              }`}
            >
              <AlertTriangle size={26} className={destructive ? "text-destructive" : "text-primary"} />
            </div>
            <h3 className="text-center text-lg font-black text-foreground">{title}</h3>
            {description && (
              <p className="mt-1.5 text-center text-sm text-muted-foreground">{description}</p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                onClick={onCancel}
                disabled={loading}
                className="flex-1 rounded-2xl border border-border bg-muted/40 py-3 text-sm font-bold text-muted-foreground active:scale-[0.98] disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 rounded-2xl py-3 text-sm font-bold text-primary-foreground active:scale-[0.98] disabled:opacity-50 ${
                  destructive ? "bg-destructive" : "gradient-warm shadow-soft"
                }`}
              >
                {loading ? "..." : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      </>
    )}
  </AnimatePresence>
);

export default ConfirmDialog;
