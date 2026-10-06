import { UI } from "./ui";
import { PAGES } from "./pages";
import { LEGAL } from "./legal";
import { CATALOG } from "./catalog";
import { NOTIFICATIONS } from "./notifications";
import { EXTRAS } from "./extras";

export const ZH: Record<string, string> = { ...UI, ...PAGES, ...LEGAL, ...CATALOG, ...NOTIFICATIONS, ...EXTRAS };
