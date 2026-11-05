'use strict';

// Browser tests for the Modern Gradient plugin. Build the fixture first:
//
//   scripts/build-theme-preview.sh gitbook-plugin-modern-gradient/test/fixture-book /tmp/mg-out
//   npx -y @playwright/test@1.49.1 test -c gitbook-plugin-modern-gradient/test/e2e
//
// MG_OUT points at another build, MG_PORT at another port.
const path = require('path');

// `npx @playwright/test` runs without a local install (the plugin keeps no
// such dependency): let the test workers resolve @playwright/test from the
// running CLI's own node_modules. A local install, if any, still wins.
if (require.main && /@playwright[\\/]test[\\/]cli\.js$/.test(require.main.filename)) {
    const cliModules = path.resolve(path.dirname(require.main.filename), '..', '..');
    const current = process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : [];
    if (current.indexOf(cliModules) === -1) {
        process.env.NODE_PATH = current.concat(cliModules).join(path.delimiter);
        // this process loads the specs too; workers inherit the variable
        require('module')._initPaths();
    }
}

const port = Number(process.env.MG_PORT || 4317);
const out = path.resolve(process.env.MG_OUT || '/tmp/mg-out');

module.exports = {
    testDir: __dirname,
    testMatch: '*.spec.js',
    outputDir: path.join(__dirname, 'test-results'),
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: path.join(__dirname, 'playwright-report') }]] : 'list',
    use: {
        baseURL: 'http://127.0.0.1:' + port + '/docs/',
        trace: 'retain-on-failure'
    },
    projects: [
        { name: 'chromium', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } }
    ],
    webServer: {
        command: 'node "' + path.join(__dirname, 'serve.js') + '" "' + out + '" ' + port,
        url: 'http://127.0.0.1:' + port + '/docs/',
        reuseExistingServer: !process.env.CI,
        timeout: 30000
    }
};
