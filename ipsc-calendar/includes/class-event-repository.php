<?php
/**
 * Reads events from The Events Calendar and maps them to a compact payload.
 *
 * @package IpscCalendar
 */

namespace IpscCalendar;

defined( 'ABSPATH' ) || exit;

/**
 * Event data source.
 *
 * The payload is normalized: events reference venues and organizers by ID and
 * categories / tags by slug, while the entities themselves are listed once.
 */
final class Event_Repository {

	/** Hard cap on events returned for a single range. */
	const MAX_EVENTS = 2000;

	const CATEGORY_TAXONOMY = 'tribe_events_cat';

	const TAG_TAXONOMY = 'post_tag';

	/** @var array<string, array<string|int, array>> Entities referenced by the mapped events. */
	private $lookups = array();

	/**
	 * Returns all published events overlapping the given date range.
	 *
	 * @param string $from Start date (Y-m-d), inclusive.
	 * @param string $to   End date (Y-m-d), inclusive.
	 */
	public function find_between( string $from, string $to ): array {
		$cache_key = Cache::key( 'events', $from, $to, get_locale() );
		$cached    = get_transient( $cache_key );

		if ( is_array( $cached ) ) {
			return $cached;
		}

		$payload = $this->build_payload( $this->query_posts( $from, $to ), $from, $to );

		/**
		 * Filters the cache lifetime of a range payload, in seconds.
		 *
		 * @param int $ttl Lifetime in seconds.
		 */
		$ttl = (int) apply_filters( 'ipsc_calendar_cache_ttl', HOUR_IN_SECONDS );
		set_transient( $cache_key, $payload, $ttl );

		return $payload;
	}

	/**
	 * @param string $from Start date (Y-m-d).
	 * @param string $to   End date (Y-m-d).
	 * @return \WP_Post[]
	 */
	private function query_posts( string $from, string $to ): array {
		$range_start = $from . ' 00:00:00';
		$range_end   = $to . ' 23:59:59';

		if ( function_exists( 'tribe_events' ) ) {
			// The ORM understands recurring-event occurrences (custom tables), so prefer it.
			$repository = tribe_events()
				->where( 'status', 'publish' )
				->where( 'date_overlaps', $range_start, $range_end )
				->order_by( 'event_date', 'ASC' )
				->per_page( self::MAX_EVENTS )
				->page( 1 );

			/**
			 * Filters the TEC repository before events are fetched,
			 * e.g. to add a language constraint for a multilingual site.
			 *
			 * @param \Tribe__Repository__Interface $repository Event repository.
			 * @param string                        $from       Range start (Y-m-d).
			 * @param string                        $to         Range end (Y-m-d).
			 */
			$repository = apply_filters( 'ipsc_calendar_event_repository', $repository, $from, $to );

			return array_filter( (array) $repository->all(), array( $this, 'is_visible' ) );
		}

		$query = new \WP_Query(
			array(
				'post_type'                    => 'tribe_events',
				'post_status'                  => 'publish',
				'posts_per_page'               => self::MAX_EVENTS,
				'no_found_rows'                => true,
				'tribe_suppress_query_filters' => true,
				'meta_key'                     => '_EventStartDate', // phpcs:ignore WordPress.DB.SlowDBQuery
				'orderby'                      => 'meta_value',
				'order'                        => 'ASC',
				'meta_query'                   => array( // phpcs:ignore WordPress.DB.SlowDBQuery
					'relation' => 'AND',
					array(
						'key'     => '_EventStartDate',
						'value'   => $range_end,
						'compare' => '<=',
						'type'    => 'DATETIME',
					),
					array(
						'key'     => '_EventEndDate',
						'value'   => $range_start,
						'compare' => '>=',
						'type'    => 'DATETIME',
					),
				),
			)
		);

		return array_filter( $query->posts, array( $this, 'is_visible' ) );
	}

	/**
	 * Respects TEC's "Hide from event listings" checkbox.
	 *
	 * @param mixed $post Post candidate.
	 */
	private function is_visible( $post ): bool {
		return $post instanceof \WP_Post && 'yes' !== get_post_meta( $post->ID, '_EventHideFromUpcoming', true );
	}

	/**
	 * @param \WP_Post[] $posts Event posts.
	 * @param string     $from  Range start.
	 * @param string     $to    Range end.
	 */
	private function build_payload( array $posts, string $from, string $to ): array {
		$this->lookups = array(
			'categories' => array(),
			'tags'       => array(),
			'venues'     => array(),
			'organizers' => array(),
		);

		$events = array();
		foreach ( $posts as $post ) {
			$event = $this->map_event( $post );
			if ( null !== $event ) {
				$events[] = $event;
			}
		}

		$by_name = static function ( $a, $b ) {
			return strcasecmp( $a['name'], $b['name'] );
		};

		$payload = array(
			'from'        => $from,
			'to'          => $to,
			'generatedAt' => gmdate( 'c' ),
			'events'      => $events,
		);

		foreach ( $this->lookups as $type => $items ) {
			$items = array_values( $items );
			usort( $items, $by_name );
			$payload[ $type ] = $items;
		}

		return $payload;
	}

	/**
	 * @param \WP_Post $post Event post (or a recurring occurrence).
	 */
	private function map_event( \WP_Post $post ): ?array {
		$id    = (int) $post->ID;
		$dates = $this->read_dates( $post );

		if ( null === $dates ) {
			return null;
		}

		$permalink = get_permalink( $post );

		$data = array(
			'id'         => $id,
			'title'      => $this->decode( get_the_title( $post ) ),
			'url'        => esc_url_raw( (string) $permalink ),
			'start'      => $dates['start'],
			'end'        => $dates['end'],
			'allDay'     => $dates['all_day'],
			'timezone'   => $dates['timezone'],
			'excerpt'    => $this->excerpt( $post ),
			'image'      => esc_url_raw( (string) get_the_post_thumbnail_url( $post, 'medium_large' ) ),
			'cost'       => function_exists( 'tribe_get_cost' ) ? $this->decode( (string) tribe_get_cost( $id, true ) ) : '',
			'featured'   => (bool) get_post_meta( $id, '_tribe_featured', true ),
			'website'    => function_exists( 'tribe_get_event_website_url' ) ? esc_url_raw( (string) tribe_get_event_website_url( $id ) ) : '',
			'categories' => $this->collect_terms( $id, self::CATEGORY_TAXONOMY, 'categories' ),
			'tags'       => $this->collect_terms( $id, self::TAG_TAXONOMY, 'tags' ),
			'venue'      => $this->collect_venue( $id ),
			'organizers' => $this->collect_organizers( $id ),
			'gcal'       => function_exists( 'tribe_get_gcal_link' ) ? esc_url_raw( (string) tribe_get_gcal_link( $id ) ) : '',
			'ical'       => $permalink ? esc_url_raw( add_query_arg( 'ical', 1, $permalink ) ) : '',
			'added'      => (string) get_post_time( 'c', true, $post ),
		);

		/**
		 * Filters a single event as sent to the browser.
		 *
		 * @param array    $data Event data.
		 * @param \WP_Post $post Event post.
		 */
		return apply_filters( 'ipsc_calendar_event', $data, $post );
	}

	/**
	 * Reads local (wall-clock) start/end times of the event.
	 *
	 * @param \WP_Post $post Event post.
	 * @return array{start:string,end:string,all_day:bool,timezone:string}|null
	 */
	private function read_dates( \WP_Post $post ): ?array {
		$format = 'Y-m-d\TH:i:s';
		$event  = function_exists( 'tribe_get_event' ) ? tribe_get_event( $post ) : null;

		if ( $event && isset( $event->dates->start, $event->dates->end ) ) {
			return array(
				'start'    => $event->dates->start->format( $format ),
				'end'      => $event->dates->end->format( $format ),
				'all_day'  => ! empty( $event->all_day ),
				'timezone' => isset( $event->timezone ) ? (string) $event->timezone : '',
			);
		}

		$start = get_post_meta( $post->ID, '_EventStartDate', true );
		$end   = get_post_meta( $post->ID, '_EventEndDate', true );

		if ( ! $start ) {
			return null;
		}

		$to_iso = static function ( $value ) {
			return str_replace( ' ', 'T', substr( (string) $value, 0, 19 ) );
		};

		return array(
			'start'    => $to_iso( $start ),
			'end'      => $to_iso( $end ? $end : $start ),
			'all_day'  => 'yes' === get_post_meta( $post->ID, '_EventAllDay', true ),
			'timezone' => (string) get_post_meta( $post->ID, '_EventTimezone', true ),
		);
	}

	/**
	 * @param int    $post_id    Event ID.
	 * @param string $taxonomy   Taxonomy slug.
	 * @param string $lookup_key Lookup bucket.
	 * @return string[] Term slugs.
	 */
	private function collect_terms( int $post_id, string $taxonomy, string $lookup_key ): array {
		$terms = get_the_terms( $post_id, $taxonomy );
		if ( ! is_array( $terms ) ) {
			return array();
		}

		$slugs = array();
		foreach ( $terms as $term ) {
			$slugs[] = $term->slug;

			if ( ! isset( $this->lookups[ $lookup_key ][ $term->slug ] ) ) {
				$item = array(
					'slug' => $term->slug,
					'name' => $this->decode( $term->name ),
				);

				if ( self::CATEGORY_TAXONOMY === $taxonomy ) {
					/**
					 * Filters the display color of an event category (any CSS color).
					 * Leave empty to let the UI generate a stable color.
					 *
					 * @param string   $color Color.
					 * @param \WP_Term $term  Category term.
					 */
					$item['color'] = (string) apply_filters( 'ipsc_calendar_category_color', '', $term );
				}

				$this->lookups[ $lookup_key ][ $term->slug ] = $item;
			}
		}

		return $slugs;
	}

	/**
	 * @param int $post_id Event ID.
	 * @return int|null Venue ID.
	 */
	private function collect_venue( int $post_id ): ?int {
		$venue_id = function_exists( 'tribe_get_venue_id' )
			? (int) tribe_get_venue_id( $post_id )
			: (int) get_post_meta( $post_id, '_EventVenueID', true );

		if ( $venue_id <= 0 || 'tribe_venue' !== get_post_type( $venue_id ) ) {
			return null;
		}

		if ( ! isset( $this->lookups['venues'][ $venue_id ] ) ) {
			$this->lookups['venues'][ $venue_id ] = array(
				'id'      => $venue_id,
				'name'    => $this->decode( get_the_title( $venue_id ) ),
				'address' => $this->decode( function_exists( 'tribe_get_address' ) ? (string) tribe_get_address( $venue_id ) : '' ),
				'zip'     => $this->decode( function_exists( 'tribe_get_zip' ) ? (string) tribe_get_zip( $venue_id ) : '' ),
				'city'    => $this->decode( function_exists( 'tribe_get_city' ) ? (string) tribe_get_city( $venue_id ) : '' ),
				'region'  => $this->decode( function_exists( 'tribe_get_region' ) ? (string) tribe_get_region( $venue_id ) : '' ),
				'country' => $this->decode( function_exists( 'tribe_get_country' ) ? (string) tribe_get_country( $venue_id ) : '' ),
			);
		}

		return $venue_id;
	}

	/**
	 * @param int $post_id Event ID.
	 * @return int[] Organizer IDs.
	 */
	private function collect_organizers( int $post_id ): array {
		$ids = function_exists( 'tribe_get_organizer_ids' )
			? (array) tribe_get_organizer_ids( $post_id )
			: (array) get_post_meta( $post_id, '_EventOrganizerID', false );

		$result = array();
		foreach ( $ids as $organizer_id ) {
			$organizer_id = (int) $organizer_id;
			if ( $organizer_id <= 0 || 'tribe_organizer' !== get_post_type( $organizer_id ) ) {
				continue;
			}

			$result[] = $organizer_id;

			if ( ! isset( $this->lookups['organizers'][ $organizer_id ] ) ) {
				$this->lookups['organizers'][ $organizer_id ] = array(
					'id'      => $organizer_id,
					'name'    => $this->decode( get_the_title( $organizer_id ) ),
					'website' => function_exists( 'tribe_get_organizer_website_url' )
						? esc_url_raw( (string) tribe_get_organizer_website_url( $organizer_id ) )
						: '',
				);
			}
		}

		return array_values( array_unique( $result ) );
	}

	/**
	 * Plain-text excerpt.
	 *
	 * @param \WP_Post $post Event post.
	 */
	private function excerpt( \WP_Post $post ): string {
		$source = '' !== trim( $post->post_excerpt ) ? $post->post_excerpt : $post->post_content;
		$text   = wp_strip_all_tags( strip_shortcodes( excerpt_remove_blocks( $source ) ) );

		/** Filters the excerpt length in words. */
		$words = (int) apply_filters( 'ipsc_calendar_excerpt_words', 40 );

		return $this->decode( wp_trim_words( $text, $words, '…' ) );
	}

	/**
	 * The UI inserts text with textContent, so entities must be decoded here.
	 *
	 * @param string $value Possibly entity-encoded text.
	 */
	private function decode( string $value ): string {
		return trim( html_entity_decode( $value, ENT_QUOTES | ENT_HTML5, 'UTF-8' ) );
	}
}
