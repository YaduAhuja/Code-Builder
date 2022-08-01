// import * as applicationinsights from 'applicationinsights';

// export class AppInsights {
// 	private _client: applicationinsights.TelemetryClient;
// 	constructor() {
// 		applicationinsights.setup('InstrumentationKey=b52b34ce-69dc-46a1-9f40-a6c4d827bd60;IngestionEndpoint=https://centralindia-0.in.applicationinsights.azure.com/');
// 		this._client = applicationinsights.defaultClient;
// 	}

// 	public async sendEvent(eventName: string, properties: { [key: string]: any }): Promise<void> {
// 		this._client.trackEvent({ name: eventName, properties: properties });
// 	}
// }