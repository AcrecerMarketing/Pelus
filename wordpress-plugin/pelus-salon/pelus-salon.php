<?php
/**
 * Plugin Name: Pelus Salon – Sistema de Reservas
 * Plugin URI:  https://github.com/AcrecerMarketing/Pelus
 * Description: Sistema completo de reservas para salón de belleza. Usa el shortcode [pelus_booking] en cualquier página.
 * Version:     1.0.0
 * Author:      Pelus Salon
 * Text Domain: pelus-salon
 * License:     GPL-2.0+
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'PELUS_VERSION',    '1.0.0' );
define( 'PELUS_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'PELUS_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once PELUS_PLUGIN_DIR . 'includes/class-activator.php';
require_once PELUS_PLUGIN_DIR . 'includes/class-api.php';
require_once PELUS_PLUGIN_DIR . 'includes/class-admin.php';
require_once PELUS_PLUGIN_DIR . 'includes/class-shortcode.php';

register_activation_hook( __FILE__, [ 'Pelus_Activator', 'activate' ] );

add_action( 'rest_api_init',    [ 'Pelus_API',       'register_routes' ] );
add_action( 'admin_menu',       [ 'Pelus_Admin',     'add_menu' ] );
add_action( 'admin_enqueue_scripts', [ 'Pelus_Admin', 'enqueue_scripts' ] );
add_action( 'init',             [ 'Pelus_Shortcode', 'register' ] );
add_action( 'wp_enqueue_scripts', [ 'Pelus_Shortcode', 'enqueue_scripts' ] );
