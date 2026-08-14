// Appends a small attribution footer to every page.
//
// Opt in from book.json:
//
//   "plugins": ["site-footer"],
//   "pluginsConfig": {
//     "site-footer": {
//       "author": "Your Name",
//       "url": "https://github.com/you",
//       "prefix": "Built with",
//       "heart": true,
//       "poweredBy": true
//     }
//   }
//
// "poweredBy": true credits the GitBook project; pass an object
// ({ "label": "...", "url": "..." }) to point it somewhere else.
//
// Nothing is added unless an author or poweredBy credit is configured, so
// the plugin is inert for books that do not want it.
function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Only allow links we would be happy to render: no javascript: URIs
function safeUrl(url) {
    var value = String(url || '').trim();
    return /^https?:\/\//i.test(value) ? value : '';
}

module.exports = {
    book: {
        assets: './assets',
        css: ['site-footer.css']
    },

    hooks: {
        // 'page' runs after the markdown has become HTML, so appending here
        // puts a real anchor in the output — no client-side JS required, and
        // it survives a static `gitbook build`.
        page: function(page) {
            var config = this.config.get('pluginsConfig.site-footer', {});
            var parts = [];

            if (config.author) {
                var prefix = config.prefix == null ? 'Built with' : config.prefix;
                var heart = config.heart === false ? '' :
                    ' <span class="site-footer-heart" aria-hidden="true">♥</span>';
                var authorUrl = safeUrl(config.url);

                var name = authorUrl ?
                    '<a href="' + escapeHtml(authorUrl) + '" rel="noopener noreferrer">' +
                        escapeHtml(config.author) + '</a>' :
                    escapeHtml(config.author);

                parts.push(escapeHtml(prefix) + heart + ' by ' + name);
            }

            // Credit the project this runs on. `true` uses the defaults;
            // an object overrides the label and destination.
            if (config.poweredBy) {
                var credit = typeof config.poweredBy === 'object' ? config.poweredBy : {};
                var label = credit.label || 'GitBook';
                var creditUrl = safeUrl(credit.url || 'https://github.com/GitbookIO/gitbook');

                parts.push('Powered by ' + (creditUrl ?
                    '<a href="' + escapeHtml(creditUrl) + '" rel="noopener noreferrer">' +
                        escapeHtml(label) + '</a>' :
                    escapeHtml(label)));
            }

            if (parts.length === 0) return page;

            page.content += '\n<footer class="site-footer">' +
                parts.join(' <span class="site-footer-sep">·</span> ') +
                '</footer>\n';

            return page;
        }
    }
};
