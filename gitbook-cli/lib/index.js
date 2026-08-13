var Q = require('q');
var _ = require('lodash');
var path = require('path');

var config = require('./config');
var local = require('./local');
var registry = require('./registry');
var tags = require('./tags');

// Return book version (string) required by a book
function bookVersion(bookRoot) {
    var version;

    try {
        var bookJson = require(path.resolve(bookRoot, 'book'));
        version = bookJson.gitbook;
    } catch (e) {
        if (e.code != 'MODULE_NOT_FOUND') throw e;
    }

    return version || '*';
}

// Ensure that a version exists
// or install it
function ensureVersion(bookRoot, version, opts) {
    opts = _.defaults(opts || {}, {
        install: true
    });

    return Q()

    // If not defined, load version required from book.json
    .then(function() {
        if (version) return version;
        return bookVersion(bookRoot);
    })

    // Resolve version locally
    .then(function(_version) {
        version = _version;
        return local.resolve(version)
        // Install if needed
        .fail(function(err) {
            if (!opts.install) throw err;

            return registry.install(version)
            .then(function() {
                return ensureVersion(bookRoot, version, {
                    install: false
                });
            });
        });
    });
}

// Get version in a book
function getVersion(bookRoot, version) {
    return ensureVersion(bookRoot, version, {
        install: false
    });
}

// Ensure a version exists (or install it)
// Then load it and returns the gitbook instance
function ensureAndLoad(bookRoot, version, opts) {
    return ensureVersion(bookRoot, version, opts)
    .then(function(version) {
        return local.load(version);
    });
}

// Update current version
//   -> Check that a newer version exists
//   -> Install it
//   -> Remove previous version
function updateVersion(tag) {
    tag = tag || 'latest';

    // The newest version installed locally, if any. This used to call
    // getVersion(null, {install: false}), which passed the options object
    // where a version string belongs: it always failed, so the update never
    // saw an installed version, always re-downloaded, and never cleaned up.
    return local.resolve('*')
    .fail(function() {
        return null;
    })
    .then(function(currentV) {
        return registry.versions()
        .then(function(result) {
            var remoteVersion = result.tags[tag];
            if (!remoteVersion) throw new Error('Tag doesn\'t exist: '+tag);

            if (currentV && tags.sort(remoteVersion, currentV.version) >= 0) return null;

            return registry.install(remoteVersion)
            .then(function() {
                // Remove by folder name: currentV.tag is 'latest' or a
                // prerelease tag, not the directory the version lives in
                if (!currentV || currentV.name === remoteVersion) return;
                if (currentV.link) return; // never delete a user's aliased folder
                return local.remove(currentV.name);
            })
            .thenResolve(remoteVersion);
        });
    });
}

module.exports = {
    init: config.init,
    setRoot: config.setRoot,

    load: local.load,
    get: getVersion,
    getBookVersion: bookVersion,
    ensure: ensureVersion,
    ensureAndLoad: ensureAndLoad,
    uninstall: local.remove,
    link: local.link,
    versions: local.versions,

    update: updateVersion,

    install: registry.install,
    available: registry.versions
};
