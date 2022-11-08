import * as vscode from 'vscode';
import settings from './settings';

/**
 * Upgrades the configuration from old namespace to new namespace
 */

export default async function upgrade() {
	const conf = vscode.workspace.getConfiguration("code-builder");
	let debugDataFlag = conf.get<boolean>("build.debugData") || conf.get<boolean>("debugData");
	if (debugDataFlag) {
		console.log("Before Upgrade");
		console.log(conf);
	}

	const defaultSettings = vscode.extensions.getExtension("YaduAhuja.code-builder")?.packageJSON.contributes.configuration.properties;
	const prefix = "code-builder.";
	let count = 0;
	/**
	 * If not using the Default Value then it copies and paste 
	 * the old setting value to new setting value
	 * and removes the old setting value
	 */
	for (const [key, value] of Object.entries(settings)) {
		const preprocessKey = key.substring(prefix.length);
		const preprocessValue = value[0].toString().substring(prefix.length);
		const val = conf.get(preprocessKey);

		if (val !== undefined && val !== null && !assertValue(val, defaultSettings[key].default)) {
			if (debugDataFlag) {
				console.log("Upgrading Value from " + preprocessKey + " to " + preprocessValue);
			}
			conf.update(preprocessValue, conf.get(preprocessKey), value[1] === 1 ? 1 : undefined);
			conf.update(preprocessKey, undefined, value[1] === 1 ? 1 : undefined);
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