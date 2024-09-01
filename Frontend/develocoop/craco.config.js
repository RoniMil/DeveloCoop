module.exports = {
    babel: {
        plugins: [
            ["@babel/plugin-proposal-private-methods", { "loose": true }],
            ["@babel/plugin-proposal-class-properties", { "loose": true }],
            ["@babel/plugin-proposal-private-property-in-object", { "loose": true }] // Added plugin
        ]
    },
    webpack: {
        configure: (webpackConfig) => {
            const scopePluginIndex = webpackConfig.resolve.plugins.findIndex(
                ({ constructor }) => constructor && constructor.name === 'ModuleScopePlugin'
            );
            webpackConfig.resolve.plugins.splice(scopePluginIndex, 1);
            return webpackConfig;
        }
    }
};