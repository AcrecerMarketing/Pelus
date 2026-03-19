<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Pelus_Shortcode {

    public static function register() {
        add_shortcode( 'pelus_booking', [ __CLASS__, 'render' ] );
    }

    public static function enqueue_scripts() {
        if ( ! is_singular() ) return; // only load where shortcode may appear

        wp_enqueue_style( 'pelus-booking', PELUS_PLUGIN_URL . 'assets/css/pelus-booking.css', [], PELUS_VERSION );
        wp_enqueue_script( 'pelus-booking', PELUS_PLUGIN_URL . 'assets/js/pelus-booking.js', [], PELUS_VERSION, true );
        wp_localize_script( 'pelus-booking', 'pelusBooking', [
            'apiUrl'   => rest_url( 'pelus/v1' ),
            'nonce'    => wp_create_nonce( 'wp_rest' ),
            'currency' => get_option( 'pelus_currency', '$' ),
            'salonName'=> get_bloginfo( 'name' ),
        ]);
    }

    public static function render( $atts ) {
        return '<div id="pelus-booking-app"></div>';
    }
}
