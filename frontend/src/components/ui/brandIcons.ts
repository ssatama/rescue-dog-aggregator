import { createLucideIcon } from "lucide-react";

// lucide 1.0 dropped its brand icons (https://lucide.dev/brand-logo-statement).
// These are the 0.577 icon nodes, kept so the social links look unchanged.

export const Facebook = createLucideIcon("facebook", [
  [
    "path",
    { key: "f1", d: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" },
  ],
]);

export const Instagram = createLucideIcon("instagram", [
  ["rect", { key: "i1", width: "20", height: "20", x: "2", y: "2", rx: "5", ry: "5" }],
  ["path", { key: "i2", d: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" }],
  ["line", { key: "i3", x1: "17.5", x2: "17.51", y1: "6.5", y2: "6.5" }],
]);

export const Linkedin = createLucideIcon("linkedin", [
  [
    "path",
    {
      key: "l1",
      d: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z",
    },
  ],
  ["rect", { key: "l2", width: "4", height: "12", x: "2", y: "9" }],
  ["circle", { key: "l3", cx: "4", cy: "4", r: "2" }],
]);

export const Github = createLucideIcon("github", [
  [
    "path",
    {
      key: "g1",
      d: "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4",
    },
  ],
  ["path", { key: "g2", d: "M9 18c-4.51 2-5-2-7-2" }],
]);
