<?php
/**
 * [ipsc_calendar] shortcode.
 *
 * @package IpscCalendar
 */

namespace IpscCalendar;

defined( 'ABSPATH' ) || exit;

/**
 * Renders the mount point of the calendar UI and enqueues its assets.
 *
 * Example:
 *   [ipsc_calendar view="list" period="upcoming" lang="auto" per_page="20" categories="level-ii,level-iii"]
 */
final class Shortcode {

	const TAG = 'ipsc_calendar';

	const SCRIPT_HANDLE = 'ipsc-calendar/app';

	/**
	 * JS modules (ID => dependencies). Modules import each other by ID, so
	 * WordPress prints an import map in which every file carries ?ver=, and a
	 * plugin update refreshes all of them in visitors' browsers.
	 */
	const MODULES = array(
		'ipsc-calendar/date'             => array(),
		'ipsc-calendar/i18n'             => array(),
		'ipsc-calendar/dom'              => array(),
		'ipsc-calendar/api'              => array(),
		'ipsc-calendar/filters'          => array( 'ipsc-calendar/date' ),
		'ipsc-calendar/state'            => array( 'ipsc-calendar/filters', 'ipsc-calendar/date' ),
		'ipsc-calendar/components/event' => array( 'ipsc-calendar/dom', 'ipsc-calendar/filters', 'ipsc-calendar/date' ),
		'ipsc-calendar/views/list'       => array( 'ipsc-calendar/dom', 'ipsc-calendar/date', 'ipsc-calendar/components/event' ),
		'ipsc-calendar/views/month'      => array( 'ipsc-calendar/dom', 'ipsc-calendar/date', 'ipsc-calendar/filters', 'ipsc-calendar/components/event' ),
		'ipsc-calendar/app'              => array(
			'ipsc-calendar/dom',
			'ipsc-calendar/i18n',
			'ipsc-calendar/api',
			'ipsc-calendar/date',
			'ipsc-calendar/filters',
			'ipsc-calendar/state',
			'ipsc-calendar/views/list',
			'ipsc-calendar/views/month',
			'ipsc-calendar/components/event',
		),
	);

	const STYLE_HANDLE = 'ipsc-calendar';

	const VIEWS = array( 'list', 'month' );

	const PERIODS = array( 'upcoming', 'next7', 'month', 'next3', 'year', 'past' );

	const LANGS = array( 'pl', 'en' );

	/**
	 * Registers the shortcode and assets.
	 */
	public static function register(): void {
		add_shortcode( self::TAG, array( self::class, 'render' ) );

		wp_register_style(
			self::STYLE_HANDLE,
			IPSC_CALENDAR_URL . 'assets/css/calendar.css',
			array(),
			IPSC_CALENDAR_VERSION
		);

		foreach ( self::MODULES as $id => $dependencies ) {
			wp_register_script_module(
				$id,
				IPSC_CALENDAR_URL . 'assets/js/' . substr( $id, strlen( 'ipsc-calendar/' ) ) . '.js',
				$dependencies,
				IPSC_CALENDAR_VERSION
			);
		}
	}

	/**
	 * @param array|string $atts Shortcode attributes.
	 */
	public static function render( $atts ): string {
		$atts = shortcode_atts(
			array(
				'view'                => 'list',
				'period'              => 'upcoming',
				'lang'                => 'auto',
				'lang_switch'         => 'yes',
				'per_page'            => 20,
				'categories'          => '',
				'location_categories' => '',
				'sync_url'            => 'yes',
				'subscribe'           => 'yes',
			),
			$atts,
			self::TAG
		);

		$lang = self::resolve_lang( (string) $atts['lang'] );

		$config = array(
			'restUrl'            => esc_url_raw( rest_url( Rest_Controller::NAMESPACE_V1 . '/' ) ),
			'lang'               => $lang,
			'langSwitch'         => self::to_bool( $atts['lang_switch'] ),
			'view'               => in_array( $atts['view'], self::VIEWS, true ) ? $atts['view'] : 'list',
			'period'             => in_array( $atts['period'], self::PERIODS, true ) ? $atts['period'] : 'upcoming',
			'perPage'            => max( 5, min( 100, (int) $atts['per_page'] ) ),
			'restrictCategories' => self::slug_list( $atts['categories'] ),
			'locationCategories' => self::slug_list( $atts['location_categories'] ),
			'syncUrl'            => self::to_bool( $atts['sync_url'] ),
			'weekStart'          => (int) get_option( 'start_of_week', 1 ),
			'subscribe'          => self::to_bool( $atts['subscribe'] ) ? Subscribe_Links::build() : null,
		);

		/**
		 * Filters the configuration passed to the UI.
		 *
		 * @param array $config Config.
		 * @param array $atts   Shortcode attributes.
		 */
		$config = apply_filters( 'ipsc_calendar_config', $config, $atts );

		wp_enqueue_style( self::STYLE_HANDLE );
		wp_enqueue_script_module( self::SCRIPT_HANDLE );

		$fallback_url = function_exists( 'tribe_get_events_link' ) ? tribe_get_events_link() : home_url( '/' );
		$messages     = array(
			'pl' => array( 'Wczytywanie kalendarza…', 'Ten kalendarz wymaga JavaScriptu.', 'Przejdź do listy wydarzeń' ),
			'en' => array( 'Loading calendar…', 'This calendar requires JavaScript.', 'Go to the event list' ),
		);
		list( $loading, $noscript, $fallback ) = $messages[ $lang ];

		return sprintf(
			'<div class="ipsc-cal" data-config="%1$s"><p class="ic-boot">%2$s</p><noscript><p>%3$s <a href="%4$s">%5$s</a></p></noscript></div>',
			esc_attr( wp_json_encode( $config ) ),
			esc_html( $loading ),
			esc_html( $noscript ),
			esc_url( $fallback_url ),
			esc_html( $fallback )
		);
	}

	/**
	 * "auto" follows Polylang / WPML when present, otherwise the site locale.
	 *
	 * @param string $lang Requested language.
	 */
	private static function resolve_lang( string $lang ): string {
		$lang = strtolower( trim( $lang ) );
		if ( in_array( $lang, self::LANGS, true ) ) {
			return $lang;
		}

		$current = '';
		if ( function_exists( 'pll_current_language' ) ) {
			$current = (string) pll_current_language( 'slug' );
		}
		if ( '' === $current ) {
			$current = (string) apply_filters( 'wpml_current_language', '' );
		}
		if ( '' === $current ) {
			$current = determine_locale();
		}

		return 0 === strpos( strtolower( $current ), 'pl' ) ? 'pl' : 'en';
	}

	/**
	 * Comma-separated slugs to a clean array.
	 *
	 * @param mixed $value Attribute value.
	 * @return string[]
	 */
	private static function slug_list( $value ): array {
		return array_values( array_filter( array_map( 'sanitize_title', explode( ',', (string) $value ) ) ) );
	}

	/**
	 * @param mixed $value Attribute value.
	 */
	private static function to_bool( $value ): bool {
		return in_array( strtolower( (string) $value ), array( '1', 'yes', 'true', 'on' ), true );
	}
}
