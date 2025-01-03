/**
 * The priority of the task: these are the priorities of the Scheduler API.
 * @typedef {('background' | 'user-visible' | 'user-blocking')} SchedulerPriority
 */

/** @typedef {Record<SchedulerPriority, number>} PriorityConfigurationFallback */

/**
 * The timeouts used for requestIdleCallback, which define the maximum time the task can be delayed.
 * The task will be executed as soon as possible, in idle time, but guaranteed within the timeout.
 * @type {PriorityConfigurationFallback}
 */
const priorityIdleTimeouts = {
	background: 1000,
	"user-visible": 100,
	"user-blocking": 50,
};

/**
 * The timeouts used for setTimeout, which define the delay before the task is executed.
 * @type {PriorityConfigurationFallback}
 */
const priorityCallbackDelays = {
	background: 150,
	"user-visible": 0,
	"user-blocking": 0,
};

/** @typedef {() => void} Task */

/**
 * Queues an arbitrary task to be executed in the browser, with the given priority.
 * Allows breaking up the work of potentially long-running tasks to avoid blocking the main thread.
 * @param {Task} task The callback to be executed.
 * @param {SchedulerPriority} priority The priority of the task, following the Scheduler API.
 * @returns {Promise<void>} A promise that resolves when the task is executed, in case it needs to be tracked.
 */
const postTask = (task, priority) => {
	if (typeof window !== "undefined") {
		// Prefer to use the Scheduler API, if available.
		if ("scheduler" in window) {
			// @ts-expect-error The scheduler API is not yet in the TypeScript definitions.
			return scheduler.postTask(task, {
				priority,
			});
		}
		// Otherwise, if possible, queue the tracking in browser idle time.
		else if ("requestIdleCallback" in window) {
			return new Promise((resolve) => {
				requestIdleCallback(
					() => {
						task();
						resolve();
					},
					{ timeout: priorityIdleTimeouts[priority] },
				);
			});
		}
		// Otherwise set a timeout with the appropriate delay
		else {
			return new Promise((resolve) => {
				setTimeout(() => {
					task();
					resolve();
				}, priorityCallbackDelays[priority]);
			});
		}
	} else {
		// On Node.js, just run the task immediately.
		// This should be an edge case, but we will not suppress tasks.
		task();
		return Promise.resolve();
	}
};

export default postTask;
