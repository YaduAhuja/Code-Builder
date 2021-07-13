import * as applicationinsights from 'applicationinsights';

export class AppInsights {
	private _client : applicationinsights.TelemetryClient | null = null;
	constructor(){
		applicationinsights.setup(process.env.CONNECTION_STRING);
		this._client = applicationinsights.defaultClient;
	}
	
	public async sendEvent(eventName : string, properties: { [key:string] : any } ): Promise<void> {
		if(this._client){
			this._client.trackEvent({name : eventName, properties: properties});
		}
	}
}