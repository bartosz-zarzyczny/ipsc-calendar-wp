<?php
/**
 * Versioned transient cache.
 *
 * @package IpscCalendar
 */

namespace IpscCalendar;

defined( 'ABSPATH' ) || exit;

/**
 * Cache keys contain a version number that is bumped whenever an event,
 * venue, organizer or event taxonomy term changes. Old entries simply
 * stop being read and expire on their own.
 */
final class Cache {

	const VERSION_OPTION = 'ipsc_calendar_cache_version';

	const TRACKED_POST_TYPES = array( 'tribe_events', 'tribe_venue', 'tribe_organizer' );

	const TRACKED_TAXONOMIES = array( 'tribe_events_cat', 'post_tag' );

	/**
	 * Registers invalidation hooks.
	 */
	public static function register(): void {
		add_action( 'save_post', array( self::class, 'on_post_change' ) );
		add_action( 'before_delete_post', array( self::class, 'on_post_change' ) );
		add_action( 'trashed_post', array( self::class, 'on_post_change' ) );
		add_action( 'untrashed_post', array( self::class, 'on_post_change' ) );
		add_action( 'edited_term', array( self::class, 'on_term_change' ), 10, 3 );
		add_action( 'delete_term', array( self::class, 'on_term_change' ), 10, 3 );
	}

	/**
	 * @param int $post_id Changed post ID.
	 */
	public static function on_post_change( $post_id ): void {
		if ( in_array( get_post_type( $post_id ), self::TRACKED_POST_TYPES, true ) ) {
			self::flush();
		}
	}

	/**
	 * @param int    $term_id  Term ID.
	 * @param int    $tt_id    Term taxonomy ID.
	 * @param string $taxonomy Taxonomy slug.
	 */
	public static function on_term_change( $term_id, $tt_id, $taxonomy ): void {
		if ( in_array( $taxonomy, self::TRACKED_TAXONOMIES, true ) ) {
			self::flush();
		}
	}

	/**
	 * Invalidates every cached entry.
	 */
	public static function flush(): void {
		update_option( self::VERSION_OPTION, self::version() + 1, false );
	}

	/**
	 * Builds a cache key from arbitrary parts.
	 *
	 * @param string ...$parts Key parts.
	 */
	public static function key( string ...$parts ): string {
		return 'ipsc_cal_' . md5( self::version() . '|' . implode( '|', $parts ) );
	}

	/**
	 * Current cache version.
	 */
	private static function version(): int {
		return (int) get_option( self::VERSION_OPTION, 1 );
	}
}
