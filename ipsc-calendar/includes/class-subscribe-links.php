<?php
/**
 * "Subscribe to calendar" links for the whole calendar.
 *
 * @package IpscCalendar
 */

namespace IpscCalendar;

defined( 'ABSPATH' ) || exit;

/**
 * Builds the same subscription links as The Events Calendar's own
 * "Subscribe to calendar" menu, all pointing at TEC's iCal feed.
 */
final class Subscribe_Links {

	/**
	 * @return array{feed:string,webcal:string,google:string,ical:string,outlook365:string,outlookLive:string,ics:string}
	 */
	public static function build(): array {
		// TEC's canonical feed: the list view collects the upcoming events.
		$feed = add_query_arg(
			array(
				'post_type'    => 'tribe_events',
				'ical'         => 1,
				'eventDisplay' => 'list',
			),
			home_url( '/' )
		);

		/**
		 * Filters the iCal feed URL (http/https) used for all subscription links.
		 *
		 * @param string $feed Feed URL.
		 */
		$feed   = (string) apply_filters( 'ipsc_calendar_ical_feed_url', $feed );
		$webcal = (string) preg_replace( '#^https?://#i', 'webcal://', $feed );
		$name   = wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES );

		$outlook = static function ( string $host ) use ( $webcal, $name ): string {
			return 'https://' . $host . '/owa?path=/calendar/action/compose'
				. '&rru=addsubscription'
				. '&url=' . rawurlencode( $webcal )
				. '&name=' . rawurlencode( $name );
		};

		$links = array(
			'feed'        => $feed,
			'webcal'      => $webcal,
			'google'      => 'https://www.google.com/calendar/render?cid=' . rawurlencode( $webcal ),
			'ical'        => $webcal,
			'outlook365'  => $outlook( 'outlook.office.com' ),
			'outlookLive' => $outlook( 'outlook.live.com' ),
			'ics'         => $feed,
		);

		/**
		 * Filters the subscription links. Set a link to '' to hide it.
		 *
		 * @param array $links Links keyed by type.
		 */
		return (array) apply_filters( 'ipsc_calendar_subscribe_links', $links );
	}
}
