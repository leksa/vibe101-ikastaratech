/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          bg: '#1e293b',
          hover: '#334155',
          active: '#0f172a',
        },
        coverage: {
          low: '#ef4444',
          medium: '#eab308',
          high: '#22c55e',
        },
      },
    },
  },
  plugins: [],
}
