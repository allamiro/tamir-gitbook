// HTML escaping and URL filtering for every piece of author input the plugin
// emits as markup. Same semantics as gitbook-plugin-site-footer.

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Only allow links we would be happy to render: no javascript: or data: URIs
function safeUrl(url) {
    var value = String(url || '').trim();
    return /^https?:\/\//i.test(value) ? value : '';
}

module.exports = {
    escapeHtml: escapeHtml,
    safeUrl: safeUrl
};
