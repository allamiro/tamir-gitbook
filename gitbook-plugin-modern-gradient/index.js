// Modern Gradient: the full theme as an opt-in GitBook 3 plugin.
//
//   "plugins": ["modern-gradient"],
//   "pluginsConfig": { "modern-gradient": { "variant": "premium-developer" } }
//
// This file only wires assets, hooks and blocks; the logic lives in lib/.
var readOptions = require('./lib/options').readOptions;
var code = require('./lib/code');
var callouts = require('./lib/callouts');
var contentBlocks = require('./lib/blocks');
var chrome = require('./lib/chrome');

var CONFIG_KEY = 'pluginsConfig.modern-gradient';
var DEFAULT_WEBSITE_STYLE = 'styles/website.css';

// SUMMARY articles in reading order (this.summary.walk)
function summaryArticles(api) {
    var list = [];
    if (api.summary && typeof api.summary.walk === 'function') {
        api.summary.walk(function(article) { list.push(article); });
    }
    return list;
}

// Breadcrumbs and meta above, previous / next below. Links point at the
// articles' .md files relative to this page; GitBook's resolveLinks step
// (after this hook) turns them into .html / directory URLs exactly as it
// does for links in the Markdown, so they also work under a sub-path.
function addArticleChrome(api, page, html) {
    var from = page.path || '';
    var toURL = function(articlePath) {
        return chrome.relativeURL(from, articlePath);
    };
    var trail = chrome.breadcrumbTrail(summaryArticles(api), from, toURL);
    return chrome.insertArticleHead(html, page, trail, { minutes: chrome.readingTime(html) }) +
        chrome.renderPager(page, toURL);
}

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
            'js/mg-core.js',
            'js/mg-code.js',
            'js/mg-content.js'
        ]
    },

    // hint, tabs/tab, stepper/step, path
    blocks: contentBlocks.blocks,

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
        },

        // Raw Markdown, before GitBook wraps code in {% raw %}
        'page:before': function(page) {
            var markdown = code.protectTemplateTags(page.content);
            markdown = code.preprocessCodeOptions(markdown);
            page.content = markdown;
            return page;
        },

        // HTML (block output already pasted in), before GitBook's highlight step
        page: function(page) {
            var html = code.restoreTemplateTags(page.content);
            html = contentBlocks.unwrapBlocks(html);
            html = callouts.transformAlerts(html);
            html = callouts.transformTaskLists(html);
            html = code.transformCodeBlocks(html);
            if (page.layout !== 'home') html = addArticleChrome(this, page, html);
            page.content = html;
            return page;
        }
    }
};
