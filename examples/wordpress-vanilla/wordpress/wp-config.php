<?php
// Default PHP settings.
ini_set('session.gc_probability', 1);
ini_set('session.gc_probability', 1);
ini_set('session.gc_divisor', 100);
ini_set('session.gc_maxlifetime', 200000);
ini_set('session.cookie_lifetime', 2000000);
ini_set('pcre.backtrack_limit', 200000);
ini_set('pcre.recursion_limit', 200000);

// Set default scheme and hostname.
$site_host = 'localhost';
$site_scheme = 'https';

// Update scheme and hostname for the requested page.
if (isset($_SERVER['HTTP_HOST'])) {
    $site_host = $_SERVER['HTTP_HOST'];
}

if (getenv('PLATFORM_RELATIONSHIPS')) {
    //we're not running locally so we need to make sure $site_host is set to something appropriate
    try {
        $validURLs = json_decode(getenv('UPSTREAM_URLS'), true, 512, JSON_THROW_ON_ERROR);
    } catch (\JsonException $exception) {
        $validURLs = [];
        error_log($exception->getMessage());
    }

    //if site_host isnt a valid domain we're expecting, then set it to the default domain
    if(!in_array($site_host, array_map(function (string $url) {
        return parse_url($url, PHP_URL_HOST);
    }, $validURLs), true)) {
        //error_log("site_host is not an expected domain, setting to DOMAIN_CURRENT_HOST");
        $site_host = parse_url(filter_var(getenv('DOMAIN_CURRENT_SITE'),FILTER_VALIDATE_URL),PHP_URL_HOST);
    }

    if(getenv('DB_HOST')){

        // Avoid PHP notices on CLI requests.
        if (php_sapi_name() === 'cli') {
            session_save_path("/tmp");
        }

        define( 'DB_NAME', getenv('DB_DATABASE'));
        define( 'DB_USER', getenv('DB_USERNAME'));
        define( 'DB_PASSWORD', getenv('DB_PASSWORD'));
        define( 'DB_HOST', getenv('DB_HOST'));
        define( 'DB_CHARSET', 'utf8' );
        define( 'DB_COLLATE', '' );

        // Debug mode should be disabled on Platform.sh. Set this constant to true
        // in a wp-config-local.php file to skip this setting on local development.
        if (!defined( 'WP_DEBUG' )) {
            define( 'WP_DEBUG', false );
        }

        // Set all of the necessary keys to unique values, based on the Platform.sh
        // entropy value.
        if (getenv('PLATFORM_PROJECT_ENTROPY')) {
            $keys = [
                'AUTH_KEY',
                'SECURE_AUTH_KEY',
                'LOGGED_IN_KEY',
                'NONCE_KEY',
                'AUTH_SALT',
                'SECURE_AUTH_SALT',
                'LOGGED_IN_SALT',
                'NONCE_SALT',
            ];
            $entropy = getenv('PLATFORM_PROJECT_ENTROPY');
            foreach ($keys as $key) {
                if (!defined($key)) {
                    define( $key, $entropy . $key );
                }
            }
        }
    }
}
else {
    // Local configuration file should be in project root.
    if (file_exists(dirname(__FILE__, 2) . '/wp-config-local.php')) {
        include(dirname(__FILE__, 2) . '/wp-config-local.php');
    }
}

// Do not put a slash "/" at the end.
// https://codex.wordpress.org/Editing_wp-config.php#WP_HOME
define( 'WP_HOME', $site_scheme . '://' . $site_host );
// Do not put a slash "/" at the end.
// https://codex.wordpress.org/Editing_wp-config.php#WP_SITEURL
define( 'WP_SITEURL', WP_HOME );
define( 'WP_CONTENT_DIR', dirname( __FILE__ ) . '/wp-content' );
define( 'WP_CONTENT_URL', WP_HOME . '/wp-content' );

// Disable WordPress from running automatic updates
define( 'WP_AUTO_UPDATE_CORE', false );

// Since you can have multiple installations in one database, you need a unique
// prefix.
$table_prefix  = 'wp_';

define('WP_ALLOW_MULTISITE', false); //enables the Network setup panel in Tools
define('MULTISITE', false); //instructs WordPress to run in multisite mode

if( MULTISITE && WP_ALLOW_MULTISITE) {
    define('SUBDOMAIN_INSTALL', false); // does the instance contain subdirectory sites (false) or subdomain/multiple domain sites (true)
    define('DOMAIN_CURRENT_SITE', parse_url(filter_var(getenv('DOMAIN_CURRENT_SITE'),FILTER_VALIDATE_URL),PHP_URL_HOST));
    define('PATH_CURRENT_SITE', '/'); //path to the WordPress site if it isn't the root of the site (e.g. https://foo.com/blog/)
    define('SITE_ID_CURRENT_SITE', 1); //main/primary site ID
    define('BLOG_ID_CURRENT_SITE', 1); //main/primary/parent blog ID

    /**
     * we have a sub/multidomain multisite, and the site currently being requested is not the default domain, so we'll
     * need to set COOKIE_DOMAIN to the domain being requested
     */
    if (SUBDOMAIN_INSTALL && $site_host !== DOMAIN_CURRENT_SITE) {
        define('COOKIE_DOMAIN',$site_host);
    }
}

/** Absolute path to the WordPress directory. */
if ( ! defined( 'ABSPATH' ) ) {
    define( 'ABSPATH', dirname( __FILE__ ) . '/' );
}

/** Sets up WordPress vars and included files. */
require_once(ABSPATH . 'wp-settings.php');
