<?php
/**
 * Plugin Name:       IPSC Calendar
 * Description:       A modern, filterable front-end for The Events Calendar. Events are still managed in The Events Calendar; this plugin only changes how visitors browse them.
 * Version:           0.4.0
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Requires Plugins:  the-events-calendar
 * Author:            IPSC Calendar
 * License:           GPL-2.0-or-later
 * Text Domain:       ipsc-calendar
 *
 * @package IpscCalendar
 */

defined( 'ABSPATH' ) || exit;

define( 'IPSC_CALENDAR_VERSION', '0.4.0' );
define( 'IPSC_CALENDAR_FILE', __FILE__ );
define( 'IPSC_CALENDAR_DIR', plugin_dir_path( __FILE__ ) );
define( 'IPSC_CALENDAR_URL', plugin_dir_url( __FILE__ ) );

require_once IPSC_CALENDAR_DIR . 'includes/class-cache.php';
require_once IPSC_CALENDAR_DIR . 'includes/class-event-repository.php';
require_once IPSC_CALENDAR_DIR . 'includes/class-rest-controller.php';
require_once IPSC_CALENDAR_DIR . 'includes/class-subscribe-links.php';
require_once IPSC_CALENDAR_DIR . 'includes/class-shortcode.php';
require_once IPSC_CALENDAR_DIR . 'includes/class-plugin.php';

add_action( 'plugins_loaded', array( 'IpscCalendar\\Plugin', 'boot' ) );
