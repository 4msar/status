import { defineConfig } from "vite";

export default defineConfig({
    plugins: [
        {
            name: "html-as-text",
            transform(code, id) {
                if (id.endsWith(".html")) {
                    return `export default ${JSON.stringify(code)};`;
                }
            },
        },
    ],
});
