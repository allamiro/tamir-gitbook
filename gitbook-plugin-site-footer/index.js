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
//       "heart": true
//     }
//   }
//
// Nothing is added unless an author is configured, so the plugin is inert
// for books that do not want it.
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
            var author = config.author;

            if (!author) return page;

            var prefix = config.prefix == null ? 'Built with' : config.prefix;
            var heart = config.heart === false ? '' :
                ' <span class="site-footer-heart" aria-hidden="true">♥</span>';
            var url = safeUrl(config.url);

            var name = url ?
                '<a href="' + escapeHtml(url) + '" rel="noopener noreferrer">' +
                    escapeHtml(author) + '</a>' :
                escapeHtml(author);

            page.content += '\n<footer class="site-footer">' +
                escapeHtml(prefix) + heart + ' by ' + name +
                '</footer>\n';

            return page;
        }
    }
};
