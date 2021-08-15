import * as applicationinsights from 'applicationinsights';

export class AppInsights {
	private _client: applicationinsights.TelemetryClient;
	constructor() {
		applicationinsights.setup(process.env.CONNECTION_STRING);
		this._client = applicationinsights.defaultClient;
	}

	public async sendEvent(eventName: string, properties: { [key: string]: any }): Promise<void> {
		this._client.trackEvent({ name: eventName, properties: properties });
	}
}