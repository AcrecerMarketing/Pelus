<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Pelus_Admin {

    public static function add_menu() {
        add_menu_page(
            'Pelus Salón',
            'Pelus Salón',
            'manage_options',
            'pelus-salon',
            [ __CLASS__, 'render_page' ],
            'dashicons-calendar-alt',
            30
        );
        add_submenu_page( 'pelus-salon', 'Citas',      'Citas',      'manage_options', 'pelus-salon',           [ __CLASS__, 'render_page' ] );
        add_submenu_page( 'pelus-salon', 'Servicios',  'Servicios',  'manage_options', 'pelus-salon-services',  [ __CLASS__, 'render_services_page' ] );
        add_submenu_page( 'pelus-salon', 'Empleados',  'Empleados',  'manage_options', 'pelus-salon-employees', [ __CLASS__, 'render_employees_page' ] );
    }

    public static function enqueue_scripts( $hook ) {
        if ( strpos( $hook, 'pelus-salon' ) === false ) return;

        wp_enqueue_style( 'pelus-admin', PELUS_PLUGIN_URL . 'assets/css/pelus-admin.css', [], PELUS_VERSION );
        wp_enqueue_script( 'pelus-admin', PELUS_PLUGIN_URL . 'assets/js/pelus-admin.js', [], PELUS_VERSION, true );
        wp_localize_script( 'pelus-admin', 'pelusAdmin', [
            'apiUrl' => rest_url( 'pelus/v1' ),
            'nonce'  => wp_create_nonce( 'wp_rest' ),
        ]);
    }

    public static function render_page() {
        ?>
        <div class="wrap pelus-admin">
            <h1>📅 Pelus Salón – Citas</h1>
            <div id="pelus-appointments-app">
                <div class="pelus-toolbar">
                    <input type="date" id="pelus-filter-date" />
                    <select id="pelus-filter-status">
                        <option value="">Todos los estados</option>
                        <option value="pending">Pendiente</option>
                        <option value="confirmed">Confirmada</option>
                        <option value="completed">Completada</option>
                        <option value="cancelled">Cancelada</option>
                    </select>
                    <button class="button" onclick="pelusAdminApp.loadAppointments()">Filtrar</button>
                </div>
                <div id="pelus-appointments-table"></div>
            </div>
        </div>
        <?php
    }

    public static function render_services_page() {
        ?>
        <div class="wrap pelus-admin">
            <h1>✂️ Servicios</h1>
            <button class="button button-primary" onclick="pelusAdminApp.openServiceModal()">+ Nuevo servicio</button>
            <div id="pelus-services-table" style="margin-top:16px"></div>
            <div id="pelus-service-modal" class="pelus-modal" style="display:none">
                <div class="pelus-modal-content">
                    <h2 id="pelus-service-modal-title">Nuevo servicio</h2>
                    <label>Nombre<input type="text" id="svc-name" /></label>
                    <label>Descripción<textarea id="svc-desc"></textarea></label>
                    <label>Duración (min)<input type="number" id="svc-duration" value="60" /></label>
                    <label>Precio ($)<input type="number" id="svc-price" step="0.01" value="0" /></label>
                    <input type="hidden" id="svc-id" />
                    <div class="pelus-modal-actions">
                        <button class="button button-primary" onclick="pelusAdminApp.saveService()">Guardar</button>
                        <button class="button" onclick="pelusAdminApp.closeServiceModal()">Cancelar</button>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }

    public static function render_employees_page() {
        ?>
        <div class="wrap pelus-admin">
            <h1>👥 Empleados</h1>
            <button class="button button-primary" onclick="pelusAdminApp.openEmployeeModal()">+ Nuevo empleado</button>
            <div id="pelus-employees-table" style="margin-top:16px"></div>
            <div id="pelus-employee-modal" class="pelus-modal" style="display:none">
                <div class="pelus-modal-content">
                    <h2 id="pelus-employee-modal-title">Nuevo empleado</h2>
                    <label>Nombre<input type="text" id="emp-name" /></label>
                    <label>Email<input type="email" id="emp-email" /></label>
                    <label>Teléfono<input type="text" id="emp-phone" /></label>
                    <label>Especialidad<input type="text" id="emp-specialty" /></label>
                    <input type="hidden" id="emp-id" />
                    <div class="pelus-modal-actions">
                        <button class="button button-primary" onclick="pelusAdminApp.saveEmployee()">Guardar</button>
                        <button class="button" onclick="pelusAdminApp.closeEmployeeModal()">Cancelar</button>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }
}
