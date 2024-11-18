import { type Config } from "tailwindcss";

export default {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      colors: {
        primary: {
          100: "#FD9572",
          200: "#FD865E",
          300: "#FC774A",
          400: "#FC6836",
          500: "#FC5A22",
          600: "#FB490E",
          700: "#F13F04",
          800: "#DD3A03",
          900: "#C93503",
        },
      },
      width: {
        "full-with-padding": "calc(100% - 2rem)",
      },
      keyframes: {
        show: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        showGrow: {
          "0%": {
            opacity: "0",
            transform: "translate(0%, -5%) scale(0.90)",
          },
          "100%": { opacity: "1", transform: "translate(0%, 0%) scale(1)" },
        },
        showGrowXCentered: {
          "0%": {
            opacity: "0",
            transform: "translate(-50%, -5%) scale(0.90)",
          },
          "100%": { opacity: "1", transform: "translate(-50%, 0%) scale(1)" },
        },
        showGrowXYCentered: {
          "0%": {
            opacity: "0",
            transform: "translate(-50%, -45%) scale(0.90)",
          },
          "100%": { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
        },

        showSlideFromBottom: {
          "0%": {
            opacity: "0",
            transform: "translate(0%, 25%)",
          },
          "100%": { opacity: "1", transform: "translate(0%, 0%)" },
        },
        scrollToLeft: {
          "0%": {
            left: "0%",
          },
          "100%": { left: "-100%" },
        },
        accordionSlideUp: {
          "0%": {
            maxHeight: "50vh",
            opacity: "1",
          },
          "100%": { maxHeight: "0px", opacity: "0" },
        },
        accordionSlideDown: {
          "0%": {
            maxHeight: "0px",
            opacity: "0",
          },
          "100%": { maxHeight: "100vh", opacity: "1" },
        },
        showSlideLeft: {
          "0%": {
            opacity: "0",
            transform: "translate(50%, 0%)",
          },
          "100%": { opacity: "1", transform: "translate(0%, 0%)" },
        },
        hide: {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
      },
      animation: {
        show: "show 150ms cubic-bezier(0.16, 1, 0.3, 1)",
        showSlow: "show 400ms cubic-bezier(0.16, 1, 0.3, 1)",
        showVerySlow: "show 2000ms cubic-bezier(0.16, 1, 0.3, 1)",
        showVerySlowFwd: "show 2000ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        showGrow: "showGrow 150ms cubic-bezier(0.16, 1, 0.3, 1)",
        showGrowXCentered:
          "showGrowXCentered 150ms cubic-bezier(0.16, 1, 0.3, 1)",
        showGrowXYCentered:
          "showGrowXYCentered 150ms cubic-bezier(0.16, 1, 0.3, 1)",
        showSlideFromBottomVerySlow:
          "showSlideFromBottom 2000ms cubic-bezier(0.16, 1, 0.3, 1) 0ms 1 normal forwards",
        showSlideLeft: "showSlideLeft 150ms cubic-bezier(0.16, 1, 0.3, 1)",
        accordionSlideUp:
          "accordionSlideUp 300ms cubic-bezier(0.87, 0, 0.13, 1)",
        accordionSlideDown:
          "accordionSlideDown 300ms cubic-bezier(0.87, 0, 0.13, 1)",
        hide: "hide 100ms ease-in",
      },
    },
  },
  plugins: [],
} satisfies Config;
