var fs = require('fs');
var path = require('path');

// Compatibility fixes applied to a freshly installed GitBook engine so it
// runs on modern Node.js. Each entry is a guarded string replacement: it
// only fires when the target file still contains the legacy code, so
// re-runs and already-patched trees are no-ops.
var PATCHES = [
    {
        // send < 0.16 reads res._headers, which modern Node removed — any
        // conditional request (browser cache revalidation) crashes
        // `gitbook serve` with "Cannot read properties of undefined".
        file: 'node_modules/send/index.js',
        find: 'this.res._headers',
        replace: '(this.res.getHeaders ? this.res.getHeaders() : this.res._headers || {})'
    }
];

// Apply all patches to an installed engine folder.
function apply(root) {
    PATCHES.forEach(function(patch) {
        var file = path.resolve(root, patch.file);
        var source;

        try {
            source = fs.readFileSync(file, 'utf8');
        } catch (e) {
            return;
        }

        if (source.indexOf(patch.find) < 0) return;
        fs.writeFileSync(file, source.split(patch.find).join(patch.replace));
        console.log('Applied Node compatibility patch to', patch.file);
    });
}

module.exports = {
    apply: apply
};
