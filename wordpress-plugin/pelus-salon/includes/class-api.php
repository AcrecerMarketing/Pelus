<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Pelus_API {

    public static function register_routes() {
        $ns = 'pelus/v1';

        // Services
        register_rest_route( $ns, '/services', [
            [ 'methods' => 'GET',  'callback' => [ __CLASS__, 'get_services' ],    'permission_callback' => '__return_true' ],
            [ 'methods' => 'POST', 'callback' => [ __CLASS__, 'create_service' ],  'permission_callback' => [ __CLASS__, 'is_admin' ] ],
        ]);
        register_rest_route( $ns, '/services/(?P<id>\d+)', [
            [ 'methods' => 'PUT',    'callback' => [ __CLASS__, 'update_service' ], 'permission_callback' => [ __CLASS__, 'is_admin' ] ],
            [ 'methods' => 'DELETE', 'callback' => [ __CLASS__, 'delete_service' ], 'permission_callback' => [ __CLASS__, 'is_admin' ] ],
        ]);

        // Employees
        register_rest_route( $ns, '/employees', [
            [ 'methods' => 'GET',  'callback' => [ __CLASS__, 'get_employees' ],   'permission_callback' => '__return_true' ],
            [ 'methods' => 'POST', 'callback' => [ __CLASS__, 'create_employee' ], 'permission_callback' => [ __CLASS__, 'is_admin' ] ],
        ]);
        register_rest_route( $ns, '/employees/(?P<id>\d+)', [
            [ 'methods' => 'PUT',    'callback' => [ __CLASS__, 'update_employee' ], 'permission_callback' => [ __CLASS__, 'is_admin' ] ],
            [ 'methods' => 'DELETE', 'callback' => [ __CLASS__, 'delete_employee' ], 'permission_callback' => [ __CLASS__, 'is_admin' ] ],
        ]);

        // Available slots
        register_rest_route( $ns, '/slots', [
            'methods'             => 'GET',
            'callback'            => [ __CLASS__, 'get_slots' ],
            'permission_callback' => '__return_true',
        ]);

        // Appointments
        register_rest_route( $ns, '/appointments', [
            [ 'methods' => 'GET',  'callback' => [ __CLASS__, 'get_appointments' ],  'permission_callback' => [ __CLASS__, 'is_admin' ] ],
            [ 'methods' => 'POST', 'callback' => [ __CLASS__, 'create_appointment' ], 'permission_callback' => '__return_true' ],
        ]);
        register_rest_route( $ns, '/appointments/(?P<id>\d+)', [
            [ 'methods' => 'PATCH',  'callback' => [ __CLASS__, 'update_appointment' ], 'permission_callback' => [ __CLASS__, 'is_admin' ] ],
            [ 'methods' => 'DELETE', 'callback' => [ __CLASS__, 'delete_appointment' ], 'permission_callback' => [ __CLASS__, 'is_admin' ] ],
        ]);
    }

    // ── Permission ────────────────────────────────────────────────

    public static function is_admin() {
        return current_user_can( 'manage_options' );
    }

    // ── Services ──────────────────────────────────────────────────

    public static function get_services() {
        global $wpdb;
        $rows = $wpdb->get_results( "SELECT * FROM {$wpdb->prefix}pelus_services WHERE active=1 ORDER BY name" );
        return rest_ensure_response( $rows );
    }

    public static function create_service( $req ) {
        global $wpdb;
        $wpdb->insert( $wpdb->prefix . 'pelus_services', [
            'name'        => sanitize_text_field( $req['name'] ),
            'description' => sanitize_textarea_field( $req['description'] ?? '' ),
            'duration'    => intval( $req['duration'] ),
            'price'       => floatval( $req['price'] ),
        ]);
        return rest_ensure_response( [ 'id' => $wpdb->insert_id ] );
    }

    public static function update_service( $req ) {
        global $wpdb;
        $wpdb->update( $wpdb->prefix . 'pelus_services', [
            'name'        => sanitize_text_field( $req['name'] ),
            'description' => sanitize_textarea_field( $req['description'] ?? '' ),
            'duration'    => intval( $req['duration'] ),
            'price'       => floatval( $req['price'] ),
        ], [ 'id' => $req['id'] ] );
        return rest_ensure_response( [ 'updated' => true ] );
    }

    public static function delete_service( $req ) {
        global $wpdb;
        $wpdb->update( $wpdb->prefix . 'pelus_services', [ 'active' => 0 ], [ 'id' => $req['id'] ] );
        return rest_ensure_response( [ 'deleted' => true ] );
    }

    // ── Employees ─────────────────────────────────────────────────

    public static function get_employees() {
        global $wpdb;
        $rows = $wpdb->get_results( "SELECT * FROM {$wpdb->prefix}pelus_employees WHERE active=1 ORDER BY name" );
        return rest_ensure_response( $rows );
    }

    public static function create_employee( $req ) {
        global $wpdb;
        $wpdb->insert( $wpdb->prefix . 'pelus_employees', [
            'name'      => sanitize_text_field( $req['name'] ),
            'email'     => sanitize_email( $req['email'] ?? '' ),
            'phone'     => sanitize_text_field( $req['phone'] ?? '' ),
            'specialty' => sanitize_text_field( $req['specialty'] ?? '' ),
        ]);
        return rest_ensure_response( [ 'id' => $wpdb->insert_id ] );
    }

    public static function update_employee( $req ) {
        global $wpdb;
        $wpdb->update( $wpdb->prefix . 'pelus_employees', [
            'name'      => sanitize_text_field( $req['name'] ),
            'email'     => sanitize_email( $req['email'] ?? '' ),
            'phone'     => sanitize_text_field( $req['phone'] ?? '' ),
            'specialty' => sanitize_text_field( $req['specialty'] ?? '' ),
        ], [ 'id' => $req['id'] ] );
        return rest_ensure_response( [ 'updated' => true ] );
    }

    public static function delete_employee( $req ) {
        global $wpdb;
        $wpdb->update( $wpdb->prefix . 'pelus_employees', [ 'active' => 0 ], [ 'id' => $req['id'] ] );
        return rest_ensure_response( [ 'deleted' => true ] );
    }

    // ── Slots ─────────────────────────────────────────────────────

    public static function get_slots( $req ) {
        global $wpdb;
        $employee_id = intval( $req['employee_id'] );
        $date        = sanitize_text_field( $req['date'] );
        $duration    = intval( $req['duration'] ?? 60 );

        $booked = $wpdb->get_results( $wpdb->prepare(
            "SELECT start_time, end_time FROM {$wpdb->prefix}pelus_appointments
             WHERE employee_id=%d AND date=%s AND status != 'cancelled'",
            $employee_id, $date
        ) );

        $booked_ranges = array_map( fn($r) => [ $r->start_time, $r->end_time ], $booked );

        $work_start = '09:00';
        $work_end   = '18:00';
        $slots      = [];

        $current = strtotime( "$date $work_start" );
        $end     = strtotime( "$date $work_end" );

        while ( $current + $duration * 60 <= $end ) {
            $slot_start = date( 'H:i', $current );
            $slot_end   = date( 'H:i', $current + $duration * 60 );

            $available = true;
            foreach ( $booked_ranges as $r ) {
                if ( $slot_start < $r[1] && $slot_end > $r[0] ) {
                    $available = false;
                    break;
                }
            }

            if ( $available ) {
                $slots[] = [ 'start' => $slot_start, 'end' => $slot_end ];
            }

            $current += 30 * 60; // 30-minute increments
        }

        return rest_ensure_response( $slots );
    }

    // ── Appointments ──────────────────────────────────────────────

    public static function get_appointments( $req ) {
        global $wpdb;
        $where = '1=1';
        $args  = [];

        if ( ! empty( $req['date'] ) ) {
            $where .= ' AND a.date = %s';
            $args[] = sanitize_text_field( $req['date'] );
        }
        if ( ! empty( $req['employee_id'] ) ) {
            $where .= ' AND a.employee_id = %d';
            $args[] = intval( $req['employee_id'] );
        }

        $t  = $wpdb->prefix;
        $sql = "SELECT a.*, s.name AS service_name, s.price, e.name AS employee_name
                FROM {$t}pelus_appointments a
                JOIN {$t}pelus_services s  ON s.id = a.service_id
                JOIN {$t}pelus_employees e ON e.id = a.employee_id
                WHERE $where ORDER BY a.date, a.start_time";

        $rows = empty( $args )
            ? $wpdb->get_results( $sql )
            : $wpdb->get_results( $wpdb->prepare( $sql, ...$args ) );

        return rest_ensure_response( $rows );
    }

    public static function create_appointment( $req ) {
        global $wpdb;

        // Basic validation
        $required = [ 'service_id', 'employee_id', 'client_name', 'client_email', 'date', 'start_time', 'end_time' ];
        foreach ( $required as $field ) {
            if ( empty( $req[ $field ] ) ) {
                return new WP_Error( 'missing_field', "Campo requerido: $field", [ 'status' => 400 ] );
            }
        }

        // Check for conflicts
        $conflict = $wpdb->get_var( $wpdb->prepare(
            "SELECT id FROM {$wpdb->prefix}pelus_appointments
             WHERE employee_id=%d AND date=%s AND status != 'cancelled'
             AND start_time < %s AND end_time > %s",
            intval( $req['employee_id'] ),
            sanitize_text_field( $req['date'] ),
            sanitize_text_field( $req['end_time'] ),
            sanitize_text_field( $req['start_time'] )
        ) );

        if ( $conflict ) {
            return new WP_Error( 'conflict', 'El horario seleccionado ya no está disponible.', [ 'status' => 409 ] );
        }

        $wpdb->insert( $wpdb->prefix . 'pelus_appointments', [
            'service_id'   => intval( $req['service_id'] ),
            'employee_id'  => intval( $req['employee_id'] ),
            'client_name'  => sanitize_text_field( $req['client_name'] ),
            'client_email' => sanitize_email( $req['client_email'] ),
            'client_phone' => sanitize_text_field( $req['client_phone'] ?? '' ),
            'date'         => sanitize_text_field( $req['date'] ),
            'start_time'   => sanitize_text_field( $req['start_time'] ),
            'end_time'     => sanitize_text_field( $req['end_time'] ),
            'notes'        => sanitize_textarea_field( $req['notes'] ?? '' ),
            'status'       => 'pending',
        ]);

        $id = $wpdb->insert_id;

        // Send confirmation email
        self::send_confirmation_email( $id );

        return rest_ensure_response( [ 'id' => $id, 'status' => 'pending' ] );
    }

    public static function update_appointment( $req ) {
        global $wpdb;
        $allowed = [ 'pending', 'confirmed', 'cancelled', 'completed' ];
        $status  = sanitize_text_field( $req['status'] );
        if ( ! in_array( $status, $allowed ) ) {
            return new WP_Error( 'invalid_status', 'Estado inválido.', [ 'status' => 400 ] );
        }
        $wpdb->update( $wpdb->prefix . 'pelus_appointments', [ 'status' => $status ], [ 'id' => $req['id'] ] );
        return rest_ensure_response( [ 'updated' => true ] );
    }

    public static function delete_appointment( $req ) {
        global $wpdb;
        $wpdb->delete( $wpdb->prefix . 'pelus_appointments', [ 'id' => $req['id'] ] );
        return rest_ensure_response( [ 'deleted' => true ] );
    }

    // ── Email ─────────────────────────────────────────────────────

    private static function send_confirmation_email( $appointment_id ) {
        global $wpdb;
        $t   = $wpdb->prefix;
        $apt = $wpdb->get_row( $wpdb->prepare(
            "SELECT a.*, s.name AS service_name, e.name AS employee_name
             FROM {$t}pelus_appointments a
             JOIN {$t}pelus_services s  ON s.id = a.service_id
             JOIN {$t}pelus_employees e ON e.id = a.employee_id
             WHERE a.id = %d", $appointment_id
        ) );

        if ( ! $apt ) return;

        $to      = $apt->client_email;
        $subject = '✅ Confirmación de cita – ' . get_bloginfo( 'name' );
        $message = "Hola {$apt->client_name},\n\n"
            . "Tu cita ha sido recibida con éxito.\n\n"
            . "Servicio:  {$apt->service_name}\n"
            . "Estilista: {$apt->employee_name}\n"
            . "Fecha:     {$apt->date}\n"
            . "Hora:      {$apt->start_time} – {$apt->end_time}\n\n"
            . "Te confirmaremos a la brevedad.\n\n"
            . get_bloginfo( 'name' );

        wp_mail( $to, $subject, $message );
    }
}
