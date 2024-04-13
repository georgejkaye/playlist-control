import type { Config } from "tailwindcss"

const buffer = 50
const minDesktopSize = 1000
const minTabletSize = 600
const contentSize = minDesktopSize - buffer
const tabletContentSize = minTabletSize - buffer
const mobileContentSize = 400

const config: Config = {
  content: [
    "./node_modules/flowbite/**/*.js",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      desktop: `${minDesktopSize}px`,
      tablet: `${minTabletSize}px`,
    },
    extend: {
      width: {
        desktop: `${contentSize}px`,
        tablet: `${tabletContentSize}px`,
        mobile: `${mobileContentSize}px`,
      },
      keyframes: {
        fadein: {
          "0%": { opacity: "0%" },
          "100%": { opacity: "100%" },
        },
      },
      animation: {
        fadein: "fadein 1s ease-in",
      },
      colors: {
        "accent-blue": "#0f0765",
      },
    },
    plugins: [require("flowbite/plugin")],
  },
}
export default config
