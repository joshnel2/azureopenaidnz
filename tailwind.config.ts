import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'law-blue': '#1e3a8a',
        'law-blue-light': '#3b82f6',
        'law-blue-dark': '#1e40af',
      },
    },
  },
  plugins: [],
}
export default config