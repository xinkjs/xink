/* All functions taken directly from https://github.com/sveltejs/kit */
import * as setCookieParser from 'set-cookie-parser'
/**
 * @param {import('http').IncomingMessage} req
 * @param {number} [body_size_limit]
 */
function getRawBody(req, body_size_limit) {
	const h = req.headers;

	if (!h['content-type']) {
		return null;
	}

	const content_length = Number(h['content-length']);

	// check if no request body
	if (
		(req.httpVersionMajor === 1 && isNaN(content_length) && h['transfer-encoding'] == null) ||
		content_length === 0
	) {
		return null;
	}

	if (req.destroyed) {
		const readable = new ReadableStream();
		readable.cancel();
		return readable;
	}

	let size = 0;
	let cancelled = false;

	return new ReadableStream({
		start(controller) {
			if (body_size_limit !== undefined && content_length > body_size_limit) {
				let message = `Content-length of ${content_length} exceeds limit of ${body_size_limit} bytes.`;

				if (body_size_limit === 0) {
					// https://github.com/sveltejs/kit/pull/11589
					// TODO this exists to aid migration — remove in a future version
					message += ' To disable body size limits, specify Infinity rather than 0.';
				}

				const error = new Error(`Payload Too Large: ${message}`);

				controller.error(error);
				return;
			}

			req.on('error', (error) => {
				cancelled = true;
				controller.error(error);
			});

			req.on('end', () => {
				if (cancelled) return;
				controller.close();
			});

			req.on('data', (chunk) => {
				if (cancelled) return;

				size += chunk.length;
				if (size > content_length) {
					cancelled = true;

					const constraint = content_length ? 'content-length' : 'BODY_SIZE_LIMIT';
					const message = `request body size exceeded ${constraint} of ${content_length}`;

					const error = new Error(`Payload Too Large: ${message}`);
					controller.error(error);

					return;
				}

				controller.enqueue(chunk);

				if (controller.desiredSize === null || controller.desiredSize <= 0) {
					req.pause();
				}
			});
		},

		pull() {
			req.resume();
		},

		cancel(reason) {
			cancelled = true;
			req.destroy(reason);
		}
	});
}

/**
 * @param {string} base
 * @param {import('http').IncomingMessage} request
 * @param {number} [body_size_limit]
 * @returns {Promise<Request>}
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function getRequest(base, request, body_size_limit) {
	return new Request(base + request.url, {
		duplex: "half",
		method: request.method,
		headers: /** @type {Record<string, string>} */ (request.headers),
		body:
    	request.method === 'GET' || request.method === 'HEAD'
      	? undefined
      	: getRawBody(request, body_size_limit)
	});
}

/**
 * @param {import('http').ServerResponse} res
 * @param {Response} response
 * @returns {Promise<void>}
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function setResponse(res, response) {
  const headers = response.headers.entries()

	for (const [key, value] of headers) {
		try {
			res.setHeader(
				key,
				key === 'set-cookie'
					? setCookieParser.splitCookiesString(
							// This is absurd but necessary, TODO: investigate why
							/** @type {string}*/ (response.headers.get(key))
						)
					: value
			);
		} catch (error) {
			res.getHeaderNames().forEach((name) => res.removeHeader(name));
			res.writeHead(500).end(String(error));
			return;
		}
	}

	res.writeHead(response.status);

	if (!response.body) {
		res.end();
		return;
	}

	if (response.body.locked) {
		res.end(
			'Fatal error: Response body is locked. ' +
				"This can happen when the response was already read (for example through 'response.json()' or 'response.text()')."
		);
		return;
	}

	const reader = response.body.getReader();

	if (res.destroyed) {
		reader.cancel();
		return;
	}

	const cancel = (/** @type {Error|undefined} */ error) => {
		res.off('close', cancel);
		res.off('error', cancel);

		// If the reader has already been interrupted with an error earlier,
		// then it will appear here, it is useless, but it needs to be catch.
		reader.cancel(error).catch(() => {});
		if (error) res.destroy(error);
	};

	res.on('close', cancel);
	res.on('error', cancel);

	next();
	async function next() {
		try {
			for (;;) {
				const { done, value } = await reader.read();

				if (done) break;

				if (!res.write(value)) {
					res.once('drain', next);
					return;
				}
			}
			res.end();
		} catch (error) {
			cancel(error instanceof Error ? error : new Error(String(error)));
		}
	}
}
