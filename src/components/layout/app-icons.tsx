import type { ReactNode, SVGProps } from "react";

type IconName = "home"|"calendar"|"plus"|"plan"|"estate"|"harvest"|"activity"|"fertilizer"|"workforce"|"report"|"analytics"|"budget"|"user";
const paths: Record<IconName, ReactNode> = {
 home:<><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/></>,
 calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
 plus:<path d="M12 5v14M5 12h14"/>,
 plan:<><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M8.5 9h7M8.5 13h7M8.5 17h4"/></>,
 estate:<><path d="M12 21V9M7 21h10"/><path d="M12 9c-1-4-5-5-8-3 2 3 5 4 8 3ZM12 9c1-4 5-5 8-3-2 3-5 4-8 3ZM12 10c-3-2-6-1-8 2 3 2 6 1 8-2ZM12 10c3-2 6-1 8 2-3 2-6 1-8-2Z"/></>,
 harvest:<><path d="M12 21V8M8 12c-3 0-5-2-5-5 3 0 5 2 5 5ZM16 12c3 0 5-2 5-5-3 0-5 2-5 5Z"/><path d="M7 21h10M9 16h6"/></>,
 activity:<><path d="M4 19h16M6 16l3-4 3 2 5-7 2 2"/><circle cx="6" cy="16" r="1"/><circle cx="17" cy="7" r="1"/></>,
 fertilizer:<><path d="M7 8h10l2 12H5L7 8Z"/><path d="M9 8V5h6v3M8 13h8"/></>,
 workforce:<><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20c.4-4 2.2-6 5.5-6s5.1 2 5.5 6M14 15c3.7-.7 5.8 1 6.5 5"/></>,
 report:<><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h4M9 12h6M9 16h6"/></>,
 analytics:<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
 budget:<><rect x="3" y="6" width="18" height="14" rx="3"/><path d="M16 11h5v5h-5a2.5 2.5 0 0 1 0-5ZM7 6V4h10v2"/></>,
 user:<><circle cx="12" cy="8" r="4"/><path d="M5 21c.5-5 2.8-7 7-7s6.5 2 7 7"/></>
};
export function AppIcon({name,...props}:{name:IconName}&SVGProps<SVGSVGElement>){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>}
