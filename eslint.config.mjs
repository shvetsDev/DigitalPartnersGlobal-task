import EslintPluginPrettier from "eslint-plugin-prettier";
import VueEslintParser from "vue-eslint-parser";
import EslintPluginVue from "eslint-plugin-vue";
import EslintConfigPrettier from "eslint-config-prettier";
import EslintPluginTypescript from "@typescript-eslint/eslint-plugin";
import EslintParserTypescript from "@typescript-eslint/parser";

export default [
    {
        ignores: [
            ".vite/",
            "build/",
            "dist/",
            "node_modules/",
            "*.spec.js",
            "*.unit.js",
        ],
    },
    ...EslintPluginVue.configs["flat/essential"],
    EslintConfigPrettier,
    {
        files: ["**/*.js", "**/*.ts", "**/*.vue"],
        languageOptions: {
            parser: VueEslintParser,
            parserOptions: {
                parser: EslintParserTypescript,
                sourceType: "module",
                ecmaVersion: 2022,
                extraFileExtensions: [".vue"],
            },
        },
        rules: {
            "prettier/prettier": [
                "error",
                {
                    singleAttributePerLine: true,
                    singleQuote: false,
                    endOfLine: "auto",
                    semi: true,
                    trailingComma: "all",
                    printWidth: 80,
                    arrowParens: "always",
                    htmlWhitespaceSensitivity: "ignore",
                    bracketSameLine: false,
                },
            ],
            "@typescript-eslint/no-unused-vars": "warn",
            "no-irregular-whitespace": "off",
            "no-undef": "off",
            "vue/require-v-for-key": "warn",
            "vue/require-default-prop": "off",
            "vue/no-multiple-template-root": "off",
            "vue/multi-word-component-names": "off",
            "vue/component-name-in-template-casing": ["error", "PascalCase"],
            "vue/component-definition-name-casing": ["error", "PascalCase"],
            "vue/html-self-closing": [
                "error",
                {
                    html: {
                        void: "always",
                    },
                },
            ],
            "vue/attributes-order": [
                "error",
                {
                    order: [
                        "DEFINITION",
                        "LIST_RENDERING",
                        "CONDITIONALS",
                        "RENDER_MODIFIERS",
                        "GLOBAL",
                        ["UNIQUE", "SLOT"],
                        "TWO_WAY_BINDING",
                        "OTHER_DIRECTIVES",
                        "OTHER_ATTR",
                        "EVENTS",
                        "CONTENT",
                    ],
                    alphabetical: true,
                },
            ],
            "vue/order-in-components": [
                "error",
                {
                    order: [
                        "el",
                        "name",
                        "key",
                        "parent",
                        "functional",
                        ["delimiters", "comments"],
                        ["components", "directives", "filters"],
                        "extends",
                        "mixins",
                        ["provide", "inject"],
                        "ROUTER_GUARDS",
                        "layout",
                        "middleware",
                        "validate",
                        "scrollToTop",
                        "transition",
                        "loading",
                        "inheritAttrs",
                        "model",
                        ["props", "propsData"],
                        "emits",
                        "setup",
                        "asyncData",
                        "data",
                        "fetch",
                        "head",
                        "computed",
                        "watch",
                        "watchQuery",
                        "LIFECYCLE_HOOKS",
                        "methods",
                        ["template", "render"],
                        "renderError",
                    ],
                },
            ],
            "vue/html-closing-bracket-newline": [
                "error",
                {
                    singleline: "never",
                    multiline: "always",
                },
            ],
            "vue/max-attributes-per-line": [
                "error",
                {
                    singleline: {
                        max: 1,
                    },
                    multiline: {
                        max: 1,
                    },
                },
            ],
        },
        plugins: {
            vue: EslintPluginVue,
            prettier: EslintPluginPrettier,
            "@typescript-eslint": EslintPluginTypescript,
        },
    },
]