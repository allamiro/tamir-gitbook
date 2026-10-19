// Normalises pluginsConfig["modern-gradient"] into the options the rest of
// the plugin relies on. Never throws: unknown values fall back to defaults
// (the caller logs a warning when the variant was rejected).
var safeUrl = require('./escape').safeUrl;

var DEFAULT_VARIANT = 'premium-developer';

// Variant -> classes on <html>. One stylesheet serves every variant.
var VARIANT_CLASSES = {
    'premium-developer': 'mg-v-premium mg-v-dev',
    'premium': 'mg-v-premium',
    'developer': 'mg-v-dev',
    'minimal': ''
};

function readOptions(config) {
    var cfg = config && typeof config === 'object' ? config : {};
    var variant = typeof cfg.variant === 'string' &&
        Object.prototype.hasOwnProperty.call(VARIANT_CLASSES, cfg.variant) ?
        cfg.variant : DEFAULT_VARIANT;

    return {
        variant: variant,
        variantClasses: VARIANT_CLASSES[variant],
        editUrl: safeUrl(cfg.editUrl)
    };
}

module.exports = {
    readOptions: readOptions,
    DEFAULT_VARIANT: DEFAULT_VARIANT,
    VARIANTS: Object.keys(VARIANT_CLASSES)
};
