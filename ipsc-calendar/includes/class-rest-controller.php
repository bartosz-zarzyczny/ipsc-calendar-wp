<?php
/**
 * Public, read-only REST endpoint used by the UI.
 *
 * @package IpscCalendar
 */

namespace IpscCalendar;

defined( 'ABSPATH' ) || exit;

/**
 * GET /wp-json/ipsc-calendar/v1/events?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
final class Rest_Controller {

	const NAMESPACE_V1 = 'ipsc-calendar/v1';

	/** Longest range a single request may ask for. */
	const MAX_RANGE_DAYS = 800;

	/** @var Event_Repository */
	private $repository;

	/**
	 * @param Event_Repository $repository Event source.
	 */
	public function __construct( Event_Repository $repository ) {
		$this->repository = $repository;
	}

	/**
	 * Registers routes.
	 */
	public function register_routes(): void {
		$date_arg = array(
			'type'              => 'string',
			'required'          => true,
			'validate_callback' => array( self::class, 'is_valid_date' ),
		);

		register_rest_route(
			self::NAMESPACE_V1,
			'/events',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_events' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'from' => $date_arg,
					'to'   => $date_arg,
				),
			)
		);
	}

	/**
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_events( \WP_REST_Request $request ) {
		$from = (string) $request->get_param( 'from' );
		$to   = (string) $request->get_param( 'to' );

		$from_date = new \DateTimeImmutable( $from );
		$to_date   = new \DateTimeImmutable( $to );

		if ( $to_date < $from_date ) {
			return new \WP_Error( 'ipsc_calendar_invalid_range', 'The "to" date must not be earlier than "from".', array( 'status' => 400 ) );
		}

		if ( (int) $from_date->diff( $to_date )->days > self::MAX_RANGE_DAYS ) {
			return new \WP_Error( 'ipsc_calendar_range_too_long', 'The requested date range is too long.', array( 'status' => 400 ) );
		}

		$response = rest_ensure_response( $this->repository->find_between( $from, $to ) );
		$response->header( 'Cache-Control', 'public, max-age=300' );

		return $response;
	}

	/**
	 * @param mixed $value Raw parameter.
	 */
	public static function is_valid_date( $value ): bool {
		if ( ! is_string( $value ) || ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $value ) ) {
			return false;
		}

		$date = \DateTimeImmutable::createFromFormat( '!Y-m-d', $value );

		return $date && $date->format( 'Y-m-d' ) === $value;
	}
}
