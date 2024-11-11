/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        "right-custom": "5px 0 10px rgba(0, 0, 0, 0.2)",
        "left-custom": "-5px 0 10px rgba(0, 0, 0, 0.2)"
      }
    }
  },
  darkMode: "class"
};
