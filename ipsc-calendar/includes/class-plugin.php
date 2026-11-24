<?php
/**
 * Plugin bootstrap.
 *
 * @package IpscCalendar
 */

namespace IpscCalendar;

defined( 'ABSPATH' ) || exit;

/**
 * Wires all plugin components into WordPress.
 */
final class Plugin {

	/** Number of upcoming events in TEC's iCal feed (TEC's own default is 30). */
	const ICAL_FEED_LIMIT = 200;

	/**
	 * Boots the plugin once all plugins are loaded.
	 */
	public static function boot(): void {
		if ( ! class_exists( 'Tribe__Events__Main' ) ) {
			add_action( 'admin_notices', array( self::class, 'missing_dependency_notice' ) );
			return;
		}

		Cache::register();

		add_action(
			'rest_api_init',
			static function () {
				( new Rest_Controller( new Event_Repository() ) )->register_routes();
			}
		);

		add_action( 'init', array( Shortcode::class, 'register' ) );

		// Early priority, so a theme or another plugin can still override the limit.
		add_filter( 'tribe_ical_feed_posts_per_page', array( self::class, 'ical_feed_limit' ), 5 );
	}

	/**
	 * Raises the number of events in the subscribable iCal feed.
	 *
	 * @param int $count Current limit.
	 */
	public static function ical_feed_limit( $count ): int {
		/**
		 * Filters the number of events in the iCal feed used for subscriptions.
		 *
		 * @param int $limit Limit.
		 */
		$limit = (int) apply_filters( 'ipsc_calendar_ical_feed_limit', self::ICAL_FEED_LIMIT );

		return max( (int) $count, $limit );
	}

	/**
	 * Shown in wp-admin when The Events Calendar is not active.
	 */
	public static function missing_dependency_notice(): void {
		if ( ! current_user_can( 'activate_plugins' ) ) {
			return;
		}

		printf(
			'<div class="notice notice-error"><p>%s</p></div>',
			esc_html__( 'IPSC Calendar requires The Events Calendar plugin to be installed and active.', 'ipsc-calendar' )
		);
	}
}
