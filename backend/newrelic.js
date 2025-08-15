'use strict'

/**
 * New Relic agent configuration.
 *
 * See lib/config/default.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
  /**
   * Array of application names.
   */
  app_name: [process.env.NEW_RELIC_APP_NAME || 'StellarRec-Backend'],
  /**
   * Your New Relic license key.
   */
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  /**
   * This setting controls distributed tracing.
   * Distributed tracing lets you see the path that a request takes through your
   * distributed system. Enabling distributed tracing changes the behavior of some
   * New Relic features, so carefully consult the transition guide before you enable
   * this feature: https://docs.newrelic.com/docs/transition-guide-distributed-tracing
   * Default is true.
   */
  distributed_tracing: {
    /**
     * Enables/disables distributed tracing.
     *
     * @env NEW_RELIC_DISTRIBUTED_TRACING_ENABLED
     */
    enabled: true
  },
  logging: {
    /**
     * Level at which to log. 'trace' is most useful to New Relic when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level: process.env.NEW_RELIC_LOG_LEVEL || 'info'
  },
  /**
   * When true, all request headers except for those listed in attributes.exclude
   * will be captured for all traces, unless otherwise specified in a destination's
   * attributes include/exclude lists.
   */
  allow_all_headers: true,
  attributes: {
    /**
     * Prefix of attributes to exclude from all destinations. Allows * as wildcard
     * at end.
     */
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.proxyAuthorization',
      'request.headers.setCookie*',
      'request.headers.x*',
      'response.headers.cookie',
      'response.headers.authorization',
      'response.headers.proxyAuthorization',
      'response.headers.setCookie*',
      'response.headers.x*'
    ]
  },
  /**
   * Transaction tracer captures deep information about slow
   * transactions and sends this to the UI on a periodic basis. The
   * transaction tracer is enabled by default. Set this to false to turn it off.
   */
  transaction_tracer: {
    /**
     * Threshold in milliseconds. When the response time of a controller action
     * exceeds this threshold, a transaction trace will be recorded.
     */
    transaction_threshold: 'apdex_f',
    /**
     * Determines whether the agent captures parameters in the query string for
     * the transaction trace.
     */
    capture_params: false,
    /**
     * Threshold in milliseconds. If the response time of a database query
     * exceeds this threshold, then the query will be recorded in the slow query
     * trace.
     */
    database_query_threshold: 500,
    /**
     * If true, the agent will capture query information for all database
     * queries. If false, or not present, the agent will only capture slow
     * queries.
     */
    record_sql: 'obfuscated',
    /**
     * Threshold in milliseconds. If a database query to a single table takes
     * longer than this, then the query plan will be captured for that query.
     */
    explain_threshold: 500
  },
  /**
   * Error collector captures information about uncaught exceptions and
   * sends them to the UI for viewing. The error collector is enabled by default.
   * Set this to false to turn it off.
   */
  error_collector: {
    /**
     * Disables the error collector.
     */
    enabled: true,
    /**
     * List of HTTP error status codes the error collector should disregard.
     */
    ignore_status_codes: [404]
  },
  browser_monitoring: {
    /**
     * Enable browser monitoring header generation.
     */
    enable: true
  }
}