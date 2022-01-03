import * as vscode from 'vscode';
import settings from './settings';

export default async function upgrade() {
	const conf = vscode.workspace.getConfiguration("code-builder");
	let debugDataFlag = conf.get<boolean>("build.debugData") || conf.get<boolean>("debugData");
	if (debugDataFlag) {
		console.log("Before Upgrade");
		console.log(conf);
	}
	const matcher = /code-builder./g;
	let count = 0;
	for (const [key, value] of Object.entries(settings)) {
		const preprocessKey = key.replace(matcher, "").trim();
		const preprocessValue = value[0].toString().replace(matcher, "").trim();
		const val = conf.get(preprocessKey);
		if (val !== undefined && val !== null && !assertValue(val, conf.get(preprocessValue))) {
			if (debugDataFlag) {
				console.log("Upgrading Value from " + preprocessKey + " to " + preprocessValue);
			}
			conf.update(preprocessValue, conf.get(preprocessKey), value[1] === 1 ? true : false);
			// conf.update(preprocessKey, undefined);
			count++;
		} else {
			if (debugDataFlag) {
				console.log("Using default Value for " + preprocessKey);
			}
		}
	}

	if (debugDataFlag) {
		console.log(count + " values changed");
		console.log("After Upgrade");
		console.log(conf);
	}
}

/**
 * 
 * @param previousSettingValue The Previous Setting Value
 * @param newSettingValue The new Setting Value
 * @returns true if both values are same else false
 */
function assertValue(previousSettingValue: any, newSettingValue: any): boolean {
	if (typeof (previousSettingValue) === 'object') {
		if (Array.isArray(previousSettingValue)) {
			previousSettingValue.sort();
			newSettingValue.sort();
			return previousSettingValue.toString() === newSettingValue.toString();
		}

		for (const [key, value] of Object.entries(previousSettingValue)) {
			if (newSettingValue[key] !== value) {
				return false;
			}
		}
		return true;
	}
	return previousSettingValue === newSettingValue;
}