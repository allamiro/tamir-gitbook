// Modern Gradient: the full theme as an opt-in GitBook 3 plugin.
//
//   "plugins": ["modern-gradient"],
//   "pluginsConfig": { "modern-gradient": { "variant": "premium-developer" } }
//
// This file only wires assets, hooks and blocks; the logic lives in lib/.
var readOptions = require('./lib/options').readOptions;

var CONFIG_KEY = 'pluginsConfig.modern-gradient';
var DEFAULT_WEBSITE_STYLE = 'styles/website.css';

// Plugin names may carry a version ("name@1.0.0") or be objects
function pluginName(entry) {
    var name = entry && typeof entry === 'object' ? entry.name : entry;
    return String(name || '').split('@')[0];
}

module.exports = {
    book: {
        assets: './assets',
        css: [
            'css/tokens.css',
            'css/base.css',
            'css/components.css'
        ],
        js: [
            'js/mg-icons.js',
            'js/mg-core.js'
        ]
    },

    hooks: {
        init: function() {
            var config = this.config.get(CONFIG_KEY, {}) || {};
            var options = readOptions(config);

            if (config.variant != null && config.variant !== options.variant) {
                this.log.warn.ln('modern-gradient: unknown variant "' + config.variant +
                    '", using "' + options.variant + '"');
            }
            if (config.editUrl && !options.editUrl) {
                this.log.warn.ln('modern-gradient: editUrl must be an http(s) URL; ignoring it');
            }

            // theme-default defaults styles.website to "styles/website.css" (a
            // book's own overrides); anything else is another theme
            var website = this.config.get('styles.website');
            if (website && website !== DEFAULT_WEBSITE_STYLE) {
                this.log.warn.ln('modern-gradient: styles.website is set; another theme ' +
                    'stylesheet will conflict with Modern Gradient. Remove it from book.json.');
            }

            var plugins = this.config.get('plugins', []) || [];
            if (typeof plugins === 'string') plugins = plugins.split(',');
            var hasExpandable = plugins.some(function(entry) {
                return pluginName(entry).trim() === 'expandable-chapters';
            });
            if (hasExpandable) {
                this.log.warn.ln('modern-gradient: expandable-chapters is listed; ' +
                    'Modern Gradient provides collapsible chapters itself. Remove it from book.json.');
            }

            // Normalised values for the templates (page.html, header.html) and
            // for the browser scripts (gitbook.state.config)
            this.config.set(CONFIG_KEY + '.variant', options.variant);
            this.config.set(CONFIG_KEY + '.variantClasses', options.variantClasses);
            this.config.set(CONFIG_KEY + '.editUrl', options.editUrl);
        }
    }
};
