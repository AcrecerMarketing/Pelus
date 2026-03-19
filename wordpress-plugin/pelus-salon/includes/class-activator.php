<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Pelus_Activator {

    public static function activate() {
        global $wpdb;
        $charset = $wpdb->get_charset_collate();

        $services_table = $wpdb->prefix . 'pelus_services';
        $employees_table = $wpdb->prefix . 'pelus_employees';
        $appointments_table = $wpdb->prefix . 'pelus_appointments';

        $sql = "
        CREATE TABLE IF NOT EXISTS $services_table (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            name        VARCHAR(150) NOT NULL,
            description TEXT,
            duration    INT NOT NULL DEFAULT 60,
            price       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            active      TINYINT(1) NOT NULL DEFAULT 1,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
        ) $charset;

        CREATE TABLE IF NOT EXISTS $employees_table (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            name        VARCHAR(150) NOT NULL,
            email       VARCHAR(150),
            phone       VARCHAR(30),
            specialty   VARCHAR(200),
            avatar      VARCHAR(255),
            active      TINYINT(1) NOT NULL DEFAULT 1,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
        ) $charset;

        CREATE TABLE IF NOT EXISTS $appointments_table (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            service_id    INT NOT NULL,
            employee_id   INT NOT NULL,
            client_name   VARCHAR(150) NOT NULL,
            client_email  VARCHAR(150) NOT NULL,
            client_phone  VARCHAR(30),
            date          DATE NOT NULL,
            start_time    TIME NOT NULL,
            end_time      TIME NOT NULL,
            status        ENUM('pending','confirmed','cancelled','completed') DEFAULT 'pending',
            notes         TEXT,
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (service_id)  REFERENCES $services_table(id)  ON DELETE CASCADE,
            FOREIGN KEY (employee_id) REFERENCES $employees_table(id) ON DELETE CASCADE
        ) $charset;
        ";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta( $sql );

        self::seed_data();
    }

    private static function seed_data() {
        global $wpdb;
        $services_table  = $wpdb->prefix . 'pelus_services';
        $employees_table = $wpdb->prefix . 'pelus_employees';

        if ( $wpdb->get_var( "SELECT COUNT(*) FROM $services_table" ) > 0 ) return;

        $services = [
            [ 'Corte de cabello',  'Corte personalizado según tu estilo',            30, 25.00 ],
            [ 'Coloración',        'Tinte completo con productos profesionales',     120, 85.00 ],
            [ 'Manicure',          'Limpieza y esmaltado de uñas',                   45, 20.00 ],
            [ 'Pedicure',          'Tratamiento completo de pies',                   60, 30.00 ],
            [ 'Tratamiento capilar','Hidratación profunda y nutrición del cabello', 90, 55.00 ],
        ];

        foreach ( $services as $s ) {
            $wpdb->insert( $services_table, [
                'name'        => $s[0],
                'description' => $s[1],
                'duration'    => $s[2],
                'price'       => $s[3],
            ]);
        }

        $employees = [
            [ 'María García',  'maria@salon.com',  '+1 555-0101', 'Coloración y tratamientos' ],
            [ 'Carlos López',  'carlos@salon.com', '+1 555-0102', 'Cortes y estilos' ],
            [ 'Ana Martínez',  'ana@salon.com',    '+1 555-0103', 'Uñas y manicure' ],
        ];

        foreach ( $employees as $e ) {
            $wpdb->insert( $employees_table, [
                'name'      => $e[0],
                'email'     => $e[1],
                'phone'     => $e[2],
                'specialty' => $e[3],
            ]);
        }
    }
}
