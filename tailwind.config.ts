import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#131313",
        surface: "#131313",
        "surface-dim": "#131313",
        "surface-bright": "#393939",
        "surface-container-lowest": "#0e0e0e",
        "surface-container-low": "#1c1b1b",
        "surface-container": "#201f1f",
        "surface-container-high": "#2a2a2a",
        "surface-container-highest": "#353534",
        "on-surface": "#e5e2e1",
        "on-surface-variant": "#d2c4b8",
        outline: "#9b8f84",
        "outline-variant": "#4f453c",
        primary: "#e6c098",
        "on-primary": "#432c0f",
        "primary-container": "#ae8c68",
        "on-primary-container": "#3d260a",
        secondary: "#c9c5c7",
        "secondary-container": "#484648",
        tertiary: "#e4c098",
        error: "#ffb4ab",
        "error-container": "#93000a"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"]
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "56px", fontWeight: "600" }],
        "headline-lg": ["32px", { lineHeight: "40px", fontWeight: "600" }],
        "headline-lg-mobile": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "500" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "label-md": ["14px", { lineHeight: "20px", fontWeight: "500", letterSpacing: "0.02em" }],
        "label-sm": ["12px", { lineHeight: "16px", fontWeight: "600" }]
      },
      maxWidth: {
        container: "1280px"
      },
      spacing: {
        gutter: "24px",
        "margin-mobile": "16px",
        "margin-desktop": "40px"
      },
      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem"
      },
      boxShadow: {
        glow: "0 28px 70px rgba(174, 140, 104, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
