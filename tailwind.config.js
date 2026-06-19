/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        informa: {
          blue: '#1F4E79',
          light: '#2E75B6',
          pale: '#DEEAF1',
        }
      }
    },
  },
  plugins: [],
}
