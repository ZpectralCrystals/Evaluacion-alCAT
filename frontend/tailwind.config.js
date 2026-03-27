export default {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: "#f5fbff",
                    100: "#e1f4ff",
                    200: "#b8e8ff",
                    300: "#82d8ff",
                    400: "#43c0ff",
                    500: "#149ee6",
                    600: "#0a7dbb",
                    700: "#0a6394",
                    800: "#0d5478",
                    900: "#114664",
                },
            },
            boxShadow: {
                panel: "0 18px 50px rgba(2, 6, 23, 0.35)",
            },
            borderRadius: {
                "4xl": "2rem",
            },
        },
    },
    plugins: [],
};
